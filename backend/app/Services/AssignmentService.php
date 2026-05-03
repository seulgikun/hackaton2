<?php

namespace App\Services;

class AssignmentService
{
    /**
     * Compute a 0-100 composite score and return a full breakdown.
     */
    public function computeScore(array $teacher, array $subject, int $currentUnits): array
    {
        $reqExpertise = strtolower(trim($subject['required_expertise'] ?? ''));
        $slot = strtolower(trim($subject['time_slot'] ?? ''));

        // 1. Expertise (70 pts)
        $teacherExpertise = array_map(function ($e) {
            return strtolower(trim($e));
        }, $teacher['expertise'] ?? []);

        $reqKeywords = array_filter(array_map('trim', explode(';', $reqExpertise)));
        
        $expertisePts = 0.0;
        if (!empty($reqKeywords) && !empty($teacherExpertise)) {
            $maxScore = 0.0;
            foreach ($reqKeywords as $reqKw) {
                $reqKw = strtolower($reqKw);
                foreach ($teacherExpertise as $tExp) {
                    $tExp = strtolower($tExp);

                    // 1. Direct or Containment Match (Full Score)
                    $isMatch = false;
                    if (strlen($reqKw) < 3 || strlen($tExp) < 3) {
                        // For short strings like "C" or "R", use whole word boundaries
                        if (preg_match("/\b" . preg_quote($reqKw, '/') . "\b/i", $tExp) || 
                            preg_match("/\b" . preg_quote($tExp, '/') . "\b/i", $reqKw)) {
                            $isMatch = true;
                        }
                    } else {
                        if (str_contains($reqKw, $tExp) || str_contains($tExp, $reqKw)) {
                            $isMatch = true;
                        }
                    }

                    if ($isMatch) {
                        $maxScore = 70.0;
                        break 2;
                    }
                    
                    // 2. Lenient Word Match (Partial Score)
                    $reqWords = array_filter(explode(' ', $reqKw), function($w) { return strlen($w) > 2; });
                    $tWords = array_filter(explode(' ', $tExp), function($w) { return strlen($w) > 2; });
                    $intersect = array_intersect($reqWords, $tWords);
                    
                    if (count($intersect) > 0) {
                        $maxScore = max($maxScore, 50.0);
                    }
                }
            }
            $expertisePts = $maxScore;
        } elseif (empty($reqKeywords)) {
            $expertisePts = 35.0; // General subjects get partial credit
        }

        // 2. Availability (20 pts)
        $teacherSlots = array_map(function ($s) {
            return strtolower(trim($s));
        }, $teacher['available_times'] ?? []);

        $availPts = 0.0;
        if (empty($slot)) {
            $availPts = 20.0;
        } else {
            if (in_array($slot, $teacherSlots)) {
                $availPts = 20.0;
            }
        }

        // 3. Load balance (10 pts)
        $maxUnits = (int) ($teacher['max_units'] ?? 0);
        $loadPts = 0.0;
        if ($maxUnits > 0) {
            $remainingRatio = 1.0 - ($currentUnits / $maxUnits);
            $loadPts = round(max(0.0, $remainingRatio * 10.0), 2);
        }

        return [
            'total' => round($expertisePts + $availPts + $loadPts, 2),
            'expertise' => $expertisePts,
            'availability' => $availPts,
            'load' => $loadPts,
        ];
    }

    /**
     * Build a human-readable assignment reason.
     */
    public function buildReason(array $breakdown, array $subject, array $teacher, int $currentUnits): string
    {
        $parts = [];

        if ($breakdown['expertise'] > 0) {
            $parts[] = "Expertise match ({$subject['required_expertise']})";
        } else {
            $parts[] = "No expertise match (needs: {$subject['required_expertise']})";
        }

        if ($breakdown['availability'] > 0) {
            $parts[] = "Available at " . ($subject['time_slot'] ?: 'any time');
        } else {
            $parts[] = "Not available at {$subject['time_slot']}";
        }

        $maxUnits = $teacher['max_units'] ?: 1;
        $pctUsed = round(($currentUnits / $maxUnits) * 100);
        $parts[] = "Load balance score " . number_format($breakdown['load'], 1) . "/10 ({$pctUsed}% capacity used)";

        return implode(' | ', $parts);
    }

    /**
     * Run the assignment algorithm.
     */
    public function runAssignment(array $teachers, array $subjects, array $existingAssignments = []): array
    {
        $teacherUnits = [];
        $teacherMap = [];
        foreach ($teachers as $t) {
            $teacherUnits[$t['id']] = 0;
            $teacherMap[$t['id']] = $t;
        }

        $assignments = [];

        foreach ($subjects as $subject) {
            $slot = strtolower(trim($subject['time_slot'] ?? ''));
            $needed = (int) ($subject['units'] ?? 0);

            $candidates = [];
            foreach ($teachers as $teacher) {
                $tid = $teacher['id'];
                $current = $teacherUnits[$tid];

                // Hard constraint 1: capacity
                if ($current + $needed > $teacher['max_units']) {
                    continue;
                }

                // Hard constraint 2: Availability (Strict)
                if (!$this->fitsAvailability($subject, $teacher['available_times'] ?? [])) {
                    continue;
                }

                // Hard constraint 3: Schedule Conflict (Check against BOTH AI and Manual assignments)
                $hasConflict = false;
                $allSchedules = array_merge($assignments, $existingAssignments);
                foreach ($allSchedules as $existing) {
                    if ($existing['teacher_id'] === $tid && $this->isOverlapping($subject, $existing)) {
                        $hasConflict = true;
                        break;
                    }
                }
                if ($hasConflict) continue;

                $breakdown = $this->computeScore($teacher, $subject, $current);
                
                // Hard constraint 4: Expertise (Strict Matching)
                // If the subject has required expertise, skip teachers with 0 match points.
                if (!empty(trim($subject['required_expertise'] ?? '')) && $breakdown['expertise'] <= 0) {
                    continue;
                }

                $candidates[] = [
                    'total' => $breakdown['total'],
                    'breakdown' => $breakdown,
                    'teacher' => $teacher
                ];
            }

            if (empty($candidates)) {
                $assignments[] = [
                    'teacher_name' => 'UNASSIGNED',
                    'subject' => $subject['name'],
                    'section' => $subject['section'] ?? '',
                    'units' => $needed,
                    'assignment_reason' => 'UNASSIGNED — No teachers satisfy capacity or availability constraints.',
                    'status' => 'UNASSIGNED',
                    'subject_id' => $subject['id'],
                    'teacher_id' => null,
                    'score' => 0,
                    'score_breakdown' => ['total' => 0, 'expertise' => 0, 'availability' => 0, 'load' => 0],
                    'time_slot' => $subject['time_slot'] ?? '',
                    'days' => $subject['days'] ?? '',
                    'start_time' => $subject['start_time'] ?? '',
                    'end_time' => $subject['end_time'] ?? '',
                ];
                continue;
            }

            // Rank candidates: 
            // 1. Total score (Expertise + Availability)
            // 2. Stability (Keep existing teacher if tied)
            // 3. Load Balancing (Fewer units if still tied)
            $currentTeacherId = \App\Models\Assignment::where('subject_id', $subject['id'])->value('teacher_id');

            usort($candidates, function ($a, $b) use ($teacherUnits, $currentTeacherId) {
                if ($a['total'] != $b['total']) {
                    return $b['total'] <=> $a['total'];
                }
                
                // Stability check: prioritize existing teacher on a tie
                if ($currentTeacherId) {
                    if ($a['teacher']['id'] == $currentTeacherId) return -1;
                    if ($b['teacher']['id'] == $currentTeacherId) return 1;
                }

                return $teacherUnits[$a['teacher']['id']] <=> $teacherUnits[$b['teacher']['id']];
            });

            $best = $candidates[0];
            $bestTeacher = $best['teacher'];
            $tid = $bestTeacher['id'];

            $reason = $this->buildReason($best['breakdown'], $subject, $bestTeacher, $teacherUnits[$tid]);
            $teacherUnits[$tid] += $needed;

            $assignments[] = [
                'teacher_name' => $bestTeacher['name'],
                'subject' => $subject['name'],
                'section' => $subject['section'] ?? '',
                'units' => $needed,
                'assignment_reason' => $reason,
                'status' => 'ASSIGNED',
                'subject_id' => $subject['id'],
                'teacher_id' => $tid,
                'score' => $best['total'],
                'score_breakdown' => $best['breakdown'],
                'time_slot' => $subject['time_slot'] ?? '',
                'days' => $subject['days'] ?? '',
                'start_time' => $subject['start_time'] ?? '',
                'end_time' => $subject['end_time'] ?? '',
            ];
        }

        return [
            'assignments' => $assignments,
            'teacher_loads' => $this->getLoadSummary($assignments, $teacherMap, $teacherUnits)
        ];
    }

    public function getLoadSummary(array $assignments, array $teacherMap, array $teacherUnits): array
    {
        $summary = [];
        foreach ($teacherMap as $tid => $teacher) {
            $total = $teacherUnits[$tid] ?? 0;
            $mx = $teacher['max_units'];

            if ($total > $mx) {
                $status = 'OVERLOADED';
            } elseif ($total == $mx) {
                $status = 'FULL';
            } elseif ($total == 0) {
                $status = 'IDLE';
            } else {
                $status = 'OK';
            }

            $assignedSubjects = [];
            foreach ($assignments as $a) {
                if ($a['teacher_id'] == $tid) {
                    $assignedSubjects[] = $a['subject'];
                }
            }

            $summary[$tid] = [
                'teacher_id' => $tid,
                'teacher_name' => $teacher['name'],
                'total_units' => $total,
                'max_units' => $mx,
                'remaining_units' => max(0, $mx - $total),
                'utilization_pct' => round(($total / ($mx ?: 1)) * 100),
                'status' => $status,
                'assigned_subjects' => $assignedSubjects,
            ];
        }
        return $summary;
    }

    /**
     * Check if two schedules overlap.
     * Format: days (M, T, W, Th, F, S), start_time, end_time
     */
    public function isOverlapping(array $a, array $b): bool
    {
        // 1. Check days intersection
        $daysA = $this->parseDays($a['days'] ?? '');
        $daysB = $this->parseDays($b['days'] ?? '');
        $intersect = array_intersect($daysA, $daysB);
        
        if (empty($intersect)) return false;

        // 2. Check time overlap
        $startA = strtotime($a['start_time']);
        $endA = strtotime($a['end_time']);
        $startB = strtotime($b['start_time']);
        $endB = strtotime($b['end_time']);

        return ($startA < $endB && $endA > $startB);
    }

    /**
     * Check if a subject's schedule fits within a teacher's availability.
     * Availability format: "Monday 08:00 - 12:00"
     */
    public function fitsAvailability(array $subject, array $availableTimes): bool
    {
        if (empty($availableTimes)) return false;

        $subjectDays = $this->parseDays($subject['days'] ?? '');
        $subjectStart = strtotime($subject['start_time']);
        $subjectEnd = strtotime($subject['end_time']);

        foreach ($subjectDays as $day) {
            $dayName = $this->expandDay($day);
            $dayIsCovered = false;

            foreach ($availableTimes as $timeRange) {
                // Example: "Monday 08:00 - 12:00"
                if (stripos($timeRange, $dayName) === false) continue;

                preg_match('/(\d{1,2}:\d{2})\s*-\s*(\d{1,2}:\d{2})/', $timeRange, $matches);
                if (count($matches) < 3) continue;

                $availStart = strtotime($matches[1]);
                $availEnd = strtotime($matches[2]);

                if ($subjectStart >= $availStart && $subjectEnd <= $availEnd) {
                    $dayIsCovered = true;
                    break;
                }
            }

            if (!$dayIsCovered) return false;
        }

        return true;
    }

    private function parseDays(string $daysStr): array
    {
        // Split by comma and trim to get exact day tags (distinguishes T from Th)
        return array_filter(array_map('trim', explode(',', $daysStr)));
    }

    private function expandDay(string $day): string
    {
        return match ($day) {
            'M' => 'Monday',
            'T' => 'Tuesday',
            'W' => 'Wednesday',
            'Th' => 'Thursday',
            'F' => 'Friday',
            'S' => 'Saturday',
            default => $day
        };
    }
}
