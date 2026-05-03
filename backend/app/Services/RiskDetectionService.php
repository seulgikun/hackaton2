<?php

namespace App\Services;

class RiskDetectionService
{
    /**
     * Parses "07:30 AM" to minutes from midnight.
     */
    public function parseTime(string $timeStr): int
    {
        if (empty($timeStr)) return 0;

        // Handle HH:MM:SS (24-hour format from DB)
        if (preg_match("/^(\d{2}):(\d{2})/", $timeStr, $matches)) {
            return (int)$matches[1] * 60 + (int)$matches[2];
        }

        // Handle 08:00 AM/PM format
        if (preg_match("/(\d+):(\d+)\s*(AM|PM)/i", $timeStr, $matches)) {
            $hrs = (int) $matches[1];
            $mins = (int) $matches[2];
            $meridiem = strtoupper($matches[3]);

            if ($meridiem == "PM" && $hrs != 12) {
                $hrs += 12;
            }
            if ($meridiem == "AM" && $hrs == 12) {
                $hrs = 0;
            }
            return $hrs * 60 + $mins;
        }
        return 0;
    }

    /**
     * Parses "07:30 AM - 09:30 AM Mon" into ["day" => "Mon", "start" => mins, "end" => mins].
     */
    public function parseSchedule(string $sched): array
    {
        if (empty($sched)) {
            return ["day" => "", "start" => 0, "end" => 0];
        }

        if (preg_match("/(\d+:\d+\s*[AP]M)\s*-\s*(\d+:\d+\s*[AP]M)\s*(\w+)/i", $sched, $matches)) {
            return [
                "day" => ucfirst(strtolower(substr($matches[3], 0, 3))),
                "start" => $this->parseTime($matches[1]),
                "end" => $this->parseTime($matches[2])
            ];
        }
        return ["day" => "", "start" => 0, "end" => 0];
    }

    public function detectRisks(array $assignments, array $teachers, array $subjects): array
    {
        $teacherMap = [];
        foreach ($teachers as $t) {
            $teacherMap[$t['id']] = $t;
        }

        $subjectMap = [];
        foreach ($subjects as $s) {
            $subjectMap[$s['id']] = $s;
        }

        $teacherLoads = [];
        $teacherSchedules = [];
        foreach ($teachers as $t) {
            $teacherLoads[$t['id']] = 0.0;
            $teacherSchedules[$t['id']] = [];
        }

        // Pre-calculate loads and schedules
        foreach ($assignments as $a) {
            $tid = $a['teacher_id'] ?? null;
            if ($tid && isset($teacherMap[$tid])) {
                $teacherLoads[$tid] += (float) ($a['units'] ?? 0);
                $teacherSchedules[$tid][] = [
                    "subject" => $a,
                    "days" => $a['days'] ?? '',
                    "start" => $this->parseTime($a['start_time'] ?? ''),
                    "end" => $this->parseTime($a['end_time'] ?? '')
                ];
            }
        }

        $enrichedAssignments = [];
        foreach ($assignments as $a) {
            $tid = $a['teacher_id'] ?? null;
            $sid = $a['subject_id'] ?? null;

            $risks = [
                "expertise" => ["level" => "Low", "message" => "Expertise Verified"],
                "availability" => ["level" => "Low", "message" => "Schedule Compatible"],
                "load" => ["level" => "Low", "message" => "Within Academic Load Limits"],
                "conflict" => ["level" => "Low", "message" => "No Scheduling Conflicts Detected"],
                "overall" => ["level" => "Low", "message" => "Optimized Assignment"]
            ];

            if (!$tid || !isset($teacherMap[$tid]) || !$sid || !isset($subjectMap[$sid])) {
                $enrichedAssignments[] = array_merge($a, ["ai_review" => []]);
                continue;
            }

            $teacher = $teacherMap[$tid];
            $subject = $subjectMap[$sid];

            // 1. Expertise Check
            $reqExpertise = strtolower(trim($subject['required_expertise'] ?? ''));
            $tExpertise = array_map(function($e) { return strtolower(trim($e)); }, $teacher['expertise'] ?? []);
            
            $reqKeywords = array_filter(array_map('trim', explode(';', $reqExpertise)));
            $isExpertMatch = false;
            
            if (empty($reqKeywords)) {
                $isExpertMatch = true;
            } else {
                foreach ($reqKeywords as $reqKw) {
                    foreach ($tExpertise as $tExp) {
                        if (str_contains($reqKw, $tExp) || str_contains($tExp, $reqKw)) {
                            $isExpertMatch = true;
                            break 2;
                        }
                        $rWords = array_filter(explode(' ', $reqKw), function($w) { return strlen($w) > 2; });
                        $twWords = array_filter(explode(' ', $tExp), function($w) { return strlen($w) > 2; });
                        if (count(array_intersect($rWords, $twWords)) > 0) {
                            $isExpertMatch = true;
                            break 2;
                        }
                    }
                }
            }

            if (!$isExpertMatch) {
                $risks["expertise"] = ["level" => "High", "message" => "Low Expertise Match: missing '{$subject['required_expertise']}'"];
            }

            // 2. Availability Check (Improved Day Mapping)
            $rawDays = $a['days'] ?? '';
            $dayMap = [
                'M' => 'Monday', 'T' => 'Tuesday', 'W' => 'Wednesday', 
                'Th' => 'Thursday', 'F' => 'Friday', 'S' => 'Saturday', 'Sun' => 'Sunday',
                'TTH' => ['Tuesday', 'Thursday'], 'MW' => ['Monday', 'Wednesday'], 'MWF' => ['Monday', 'Wednesday', 'Friday']
            ];

            $neededDays = [];
            if (isset($dayMap[strtoupper($rawDays)])) {
                $val = $dayMap[strtoupper($rawDays)];
                $neededDays = is_array($val) ? $val : [$val];
            } else {
                if (str_contains(strtoupper($rawDays), 'TTH')) {
                    $neededDays = ['Tuesday', 'Thursday'];
                } elseif (str_contains(strtoupper($rawDays), 'MWF')) {
                    $neededDays = ['Monday', 'Wednesday', 'Friday'];
                } else {
                    foreach(['M', 'T', 'W', 'Th', 'F', 'S'] as $key) {
                        if (str_contains($rawDays, $key)) {
                             if ($key === 'T' && str_contains($rawDays, 'Th') && !str_contains($rawDays, ' T')) {
                             } else {
                                 $neededDays[] = $dayMap[$key];
                             }
                        }
                    }
                }
            }

            $tStart = $this->parseTime($a['start_time'] ?? '');
            $tEnd = $this->parseTime($a['end_time'] ?? '');
            
            $unmatchedDays = $neededDays;
            if ($teacher['availability_details']) {
                foreach ($teacher['availability_details'] as $avail) {
                    $availDay = $avail['day'] ?? '';
                    $availStart = $this->parseTime($avail['start_time'] ?? '');
                    $availEnd = $this->parseTime($avail['end_time'] ?? '');
                    
                    foreach ($unmatchedDays as $index => $nd) {
                        if (str_contains(strtolower($availDay), strtolower($nd)) && $tStart >= $availStart && $tEnd <= $availEnd) {
                            unset($unmatchedDays[$index]);
                        }
                    }
                }
            }

            if (!empty($neededDays) && !empty($unmatchedDays)) {
                $risks["availability"] = ["level" => "High", "message" => "Schedule Incompatible: Availability gap on " . implode(', ', $unmatchedDays)];
            } elseif (empty($neededDays) && empty($teacher['available_times'])) {
                $risks["availability"] = ["level" => "Medium", "message" => "Availability Undefined"];
            }

            // 2. Schedule Validation
            if (empty($a['days'])) {
                $risks["schedule_missing"] = ["level" => "High", "message" => "MISSING DAYS: No days assigned."];
            }
            if (empty($a['start_time']) || empty($a['end_time'])) {
                $risks["schedule_missing_time"] = ["level" => "High", "message" => "MISSING TIME: Incomplete schedule."];
            }

            // 3. Overload Check
            $currentLoad = $teacherLoads[$tid] ?? 0;
            $maxUnits = (float) ($teacher['max_units'] ?? 0);
            if ($currentLoad > $maxUnits) {
                $risks["load"] = ["level" => "High", "message" => "ACADEMIC OVERLOAD: Total units $currentLoad exceeds limit of $maxUnits"];
            } else {
                $risks["load"] = ["level" => "Low", "message" => "Within Academic Load Limits"];
            }

            // 4. Schedule Conflict Risk
            $aDays = array_filter(array_map('trim', explode(',', $a['days'] ?? '')));
            $aStart = $this->parseTime($a['start_time'] ?? '');
            $aEnd = $this->parseTime($a['end_time'] ?? '');

            if ($aStart > 0 && $aEnd > 0) {
                foreach ($teacherSchedules[$tid] as $other) {
                    if (($other['subject']['subject_id'] ?? null) == ($a['subject_id'] ?? null)) continue;
                    
                    $oDays = array_filter(array_map('trim', explode(',', $other['days'] ?? '')));
                    $hasSharedDay = !empty(array_intersect($aDays, $oDays));
                    $oneHasNoDays = empty($aDays) || empty($oDays);

                    if ($hasSharedDay || $oneHasNoDays) {
                        if (($aStart < $other['end']) && ($other['start'] < $aEnd)) {
                            $risks["conflict"] = [
                                "level" => "High", 
                                "message" => "SCHEDULE CONFLICT: Overlap detected with '{$other['subject']['subject']}'"
                            ];
                            break;
                        }
                    }
                }
            }

            $enrichedAssignments[] = array_merge($a, ["ai_review" => $risks]);
        }

        return $enrichedAssignments;
    }
}
