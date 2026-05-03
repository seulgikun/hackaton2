<?php

namespace App\Http\Controllers;

use App\Models\Teacher;
use App\Models\Subject;
use App\Models\Assignment;
use App\Models\ActivityLog;
use App\Models\Notification;
use App\Services\AssignmentService;
use App\Services\RiskDetectionService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class AssignmentController extends Controller
{
    protected $assignmentService;
    protected $riskService;

    public function __construct(AssignmentService $assignmentService, RiskDetectionService $riskService)
    {
        $this->assignmentService = $assignmentService;
        $this->riskService = $riskService;
    }

    public function index()
    {
        $allAssignments = Assignment::with(['subject', 'teacher'])->get()->map(function($a) {
            return [
                'teacher_id' => $a->teacher_id,
                'teacher_name' => $a->teacher ? $a->teacher->name : 'UNASSIGNED',
                'subject' => $a->subject ? $a->subject->name : 'DELETED SUBJECT',
                'section' => $a->subject ? $a->subject->section : '',
                'subject_id' => $a->subject_id,
                'units' => $a->subject ? $a->subject->units : 0,
                'status' => $a->status,
                'assignment_reason' => $a->assignment_reason,
                'score' => $a->score,
                'score_breakdown' => $a->score_breakdown,
                'time_slot' => $a->subject ? $a->subject->time_slot : '',
                'days' => $a->subject ? $a->subject->days : '',
                'start_time' => $a->subject ? $a->subject->start_time : '',
                'end_time' => $a->subject ? $a->subject->end_time : '',
            ];
        })->toArray();

        $teachers = Teacher::all()->toArray();
        $subjects = Subject::all()->toArray();
        
        $enriched = $this->riskService->detectRisks($allAssignments, $teachers, $subjects);
        
        $teacherUnits = [];
        foreach ($teachers as $t) $teacherUnits[$t['id']] = 0;
        foreach ($enriched as $a) {
            if ($a['teacher_id'] && isset($teacherUnits[$a['teacher_id']])) {
                $teacherUnits[$a['teacher_id']] += $a['units'];
            }
        }

        $teacherMap = [];
        foreach ($teachers as $t) $teacherMap[$t['id']] = $t;

        return response()->json([
            'assignments' => $enriched,
            'teacher_loads' => $this->assignmentService->getLoadSummary($enriched, $teacherMap, $teacherUnits),
            'summary' => $this->calculateSummary($enriched, count($teachers))
        ]);
    }

    public function generate(Request $request)
    {
        $teachers = Teacher::all()->toArray();
        $subjects = Subject::all()->toArray();

        if (empty($teachers)) {
            return response()->json(['error' => 'No teachers found.'], 400);
        }
        if (empty($subjects)) {
            return response()->json(['error' => 'No subjects found.'], 400);
        }

        // Find existing manual overrides
        $manualAssignments = Assignment::where('status', 'MANUALLY_ASSIGNED')->get();
        $manualSubjectIds = $manualAssignments->pluck('subject_id')->toArray();

        // Filter out subjects that are already manually assigned
        $subjectsToAssign = array_filter($subjects, function($s) use ($manualSubjectIds) {
            return !in_array($s['id'], $manualSubjectIds);
        });

        $result = $this->assignmentService->runAssignment($teachers, array_values($subjectsToAssign), $manualAssignments->toArray());
        
        // Merge back the manual overrides into the result
        foreach ($manualAssignments as $ma) {
            $maSubject = Subject::withTrashed()->find($ma->subject_id);
            if (!$maSubject) continue;
            
            $result['assignments'][] = [
                'teacher_id' => $ma->teacher_id,
                'teacher_name' => $ma->teacher ? $ma->teacher->name : 'Unknown',
                'subject' => $maSubject->name,
                'subject_id' => $ma->subject_id,
                'units' => $maSubject->units,
                'status' => 'MANUALLY_ASSIGNED',
                'assignment_reason' => 'Manual override',
                'score' => null,
                'score_breakdown' => null,
                'days' => $maSubject->days,
                'start_time' => $maSubject->start_time,
                'end_time' => $maSubject->end_time,
            ];
        }

        $enrichedAssignments = $this->riskService->detectRisks($result['assignments'], $teachers, $subjects);
        
        $result['assignments'] = $enrichedAssignments;

        // Persist to DB (keeping manual ones)
        DB::transaction(function () use ($result) {
            // Delete only the AI-generated assignments that aren't in the new result
            $newSubjectIds = array_column($result['assignments'], 'subject_id');
            Assignment::where('status', '!=', 'MANUALLY_ASSIGNED')
                      ->whereNotIn('subject_id', $newSubjectIds)
                      ->delete();

            foreach ($result['assignments'] as $a) {
                Assignment::updateOrCreate(
                    ['subject_id' => $a['subject_id']],
                    [
                        'teacher_id' => $a['teacher_id'],
                        'status' => $a['status'],
                        'assignment_reason' => $a['assignment_reason'],
                        'score' => $a['score'] ?? null,
                        'score_breakdown' => $a['score_breakdown'] ?? null,
                    ]
                );
            }
        });

        $teacherMap = [];
        $teacherUnits = [];
        foreach ($teachers as $t) {
            $teacherMap[$t['id']] = $t;
            $teacherUnits[$t['id']] = 0;
        }
        foreach ($result['assignments'] as $a) {
            if ($a['teacher_id'] && isset($teacherUnits[$a['teacher_id']])) {
                $teacherUnits[$a['teacher_id']] += $a['units'];
            }
        }

        $result['teacher_loads'] = $this->assignmentService->getLoadSummary($result['assignments'], $teacherMap, $teacherUnits);
        $result['summary'] = $this->calculateSummary($result['assignments'], count($teachers));

        // User Request: Notify teachers of new schedules
        foreach ($result['assignments'] as $a) {
                $teacher = Teacher::withTrashed()->find($a['teacher_id']);
                if ($teacher) {
                    Notification::create([
                        'user_id' => $teacher->user_id,
                    'title' => 'New Academic Load Assigned',
                    'message' => "You have been assigned to: {$a['subject']}. Schedule: " . ($a['days'] ?? 'TBA') . " " . ($a['start_time'] ?? '') . " - " . ($a['end_time'] ?? ''),
                    'type' => 'success'
                ]);
            }
        }

        ActivityLog::create([
            'user_id' => $request->user()->id,
            'action' => 'Generated',
            'type' => 'Load',
            'description' => "Generated a new load distribution with " . count($result['assignments']) . " assignments."
        ]);

        Notification::create([
            'user_id' => $request->user()->id,
            'title' => 'Load Plan Generated',
            'message' => "Successfully generated a new load plan with " . count($result['assignments']) . " assignments.",
            'type' => 'success'
        ]);

        return response()->json($result);
    }

    public function override(Request $request)
    {
        $request->validate([
            'subject_id' => 'required|exists:subjects,id',
            'teacher_id' => 'nullable|exists:teachers,id',
            'days' => 'nullable|string',
            'start_time' => 'nullable|string',
            'end_time' => 'nullable|string',
        ]);

        $subject = Subject::find($request->subject_id);
        $teacher = Teacher::find($request->teacher_id);

        if ($request->has('days')) {
            $subject->update([
                'days' => $request->days,
                'start_time' => $request->start_time ? date('H:i:s', strtotime($request->start_time)) : $subject->start_time,
                'end_time' => $request->end_time ? date('H:i:s', strtotime($request->end_time)) : $subject->end_time,
            ]);
        }

        $assignment = Assignment::updateOrCreate(
            ['subject_id' => $request->subject_id],
            [
                'teacher_id' => $request->teacher_id,
                'status' => $request->teacher_id ? 'MANUALLY_ASSIGNED' : 'UNASSIGNED',
                'assignment_reason' => $request->teacher_id ? "Manual override (To: {$teacher->name})" : "Manual unassignment",
                'score' => null,
                'score_breakdown' => null,
            ]
        );

        if ($teacher) {
            Notification::create([
                'user_id' => $teacher->user_id,
                'title' => 'Manual Schedule Update',
                'message' => "An administrator has manually assigned you to: {$subject->name}.",
                'type' => 'warning'
            ]);
        }

        ActivityLog::create([
            'user_id' => $request->user()->id,
            'action' => 'Updated',
            'type' => 'Load',
            'description' => "Manually assigned {$subject->name} to " . ($teacher ? $teacher->name : 'UNASSIGNED')
        ]);

        return $this->index();
    }

    public function updateRationale(Request $request)
    {
        $request->validate([
            'subject_id' => 'required|exists:subjects,id',
            'rationale' => 'required|string|max:500',
        ]);

        $assignment = Assignment::where('subject_id', $request->subject_id)->first();
        if ($assignment) {
            $assignment->update([
                'assignment_reason' => $request->rationale
            ]);
        }

        // Return the full updated state as usual
        return $this->override(new Request([
            'subject_id' => $request->subject_id,
            'teacher_id' => $assignment ? $assignment->teacher_id : null
        ]));
    }

    public function clear(Request $request)
    {
        Assignment::query()->delete(); // Soft delete all
        ActivityLog::create([
            'user_id' => $request->user()->id,
            'action' => 'Archived',
            'type' => 'Load',
            'description' => "Archived the current active load distribution."
        ]);
        Notification::create([
            'user_id' => $request->user()->id,
            'title' => 'Load Plan Archived',
            'message' => "The current load plan has been moved to archives.",
            'type' => 'warning'
        ]);
        return response()->json(['message' => 'Distribution archived successfully.']);
    }

    public function archived(Request $request)
    {
        $assignments = Assignment::onlyTrashed()
            ->with(['subject', 'teacher'])
            ->orderBy('deleted_at', 'desc')
            ->get()
            ->groupBy(function($item) {
                return $item->deleted_at->format('Y-m-d H:i:s');
            })
            ->map(function($items, $time) {
                return [
                    'deleted_at' => $time,
                    'type' => 'LOAD',
                    'count' => count($items),
                    'items' => $items
                ];
            })
            ->values();

        $teachers = Teacher::onlyTrashed()
            ->orderBy('deleted_at', 'desc')
            ->get()
            ->map(function($t) {
                return [
                    'id' => $t->id,
                    'deleted_at' => $t->deleted_at->format('Y-m-d H:i:s'),
                    'type' => 'FACULTY',
                    'name' => $t->name,
                    'details' => "Max Units: {$t->max_units}"
                ];
            });

        $subjects = Subject::onlyTrashed()
            ->orderBy('deleted_at', 'desc')
            ->get()
            ->map(function($s) {
                return [
                    'id' => $s->id,
                    'deleted_at' => $s->deleted_at->format('Y-m-d H:i:s'),
                    'type' => 'CURRICULUM',
                    'name' => $s->name,
                    'details' => "{$s->units} Units | {$s->days} {$s->start_time}"
                ];
            });

        return response()->json([
            'loads' => $assignments,
            'faculty' => $teachers,
            'curriculum' => $subjects
        ]);
    }

    public function restore(Request $request)
    {
        $request->validate([
            'deleted_at' => 'required',
            'type' => 'required|string',
            'id' => 'nullable|integer'
        ]);
        
        if ($request->type === 'LOAD') {
            DB::transaction(function() use ($request) {
                // 1. Clear current assignments
                Assignment::query()->delete();

                // 2. Restore assignments deleted at this specific time
                Assignment::onlyTrashed()
                    ->where('deleted_at', $request->deleted_at)
                    ->restore();
                
                ActivityLog::create([
                    'user_id' => $request->user()->id,
                    'action' => 'Restored',
                    'type' => 'Load',
                    'description' => "Restored load distribution from archived session: {$request->deleted_at}"
                ]);
                Notification::create([
                    'user_id' => $request->user()->id,
                    'title' => 'Load Plan Restored',
                    'message' => "Successfully restored load plan from session: {$request->deleted_at}",
                    'type' => 'success'
                ]);
            });
        } elseif ($request->type === 'FACULTY') {
            $teacher = Teacher::onlyTrashed()->findOrFail($request->id);
            $teacher->restore();
            ActivityLog::create([
                'user_id' => $request->user()->id,
                'action' => 'Restored',
                'type' => 'Faculty',
                'description' => "Restored faculty member: {$teacher->name}"
            ]);
        } elseif ($request->type === 'CURRICULUM') {
            $subject = Subject::onlyTrashed()->findOrFail($request->id);
            $subject->restore();
            ActivityLog::create([
                'user_id' => $request->user()->id,
                'action' => 'Restored',
                'type' => 'Curriculum',
                'description' => "Restored subject: {$subject->name}"
            ]);
        }

        return response()->json(['message' => 'Restored successfully.']);
    }

    public function deleteArchive(Request $request)
    {
        $request->validate([
            'deleted_at' => 'required',
            'type' => 'required|string',
            'id' => 'nullable|integer'
        ]);

        if ($request->type === 'LOAD') {
            Assignment::onlyTrashed()
                ->where('deleted_at', $request->deleted_at)
                ->forceDelete();
        } elseif ($request->type === 'FACULTY') {
            Teacher::onlyTrashed()->findOrFail($request->id)->forceDelete();
        } elseif ($request->type === 'CURRICULUM') {
            Subject::onlyTrashed()->findOrFail($request->id)->forceDelete();
        }

        return response()->json(['message' => 'Permanently deleted from archives.']);
    }

    protected function calculateSummary($assignments, $totalTeachers)

    {
        $active = array_unique(array_filter(array_column($assignments, 'teacher_id')));
        $unassigned = array_filter($assignments, function($a) { return $a['status'] == 'UNASSIGNED'; });
        
        return [
            'total_teachers' => $totalTeachers,
            'active_teachers' => count($active),
            'idle_teachers' => $totalTeachers - count($active),
            'total_subjects' => count($assignments),
            'assigned_subjects' => count($assignments) - count($unassigned),
            'unassigned_subjects' => count($unassigned),
        ];
    }
}
