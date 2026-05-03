<?php

namespace App\Http\Controllers;

use App\Models\Subject;
use App\Models\ActivityLog;
use Illuminate\Http\Request;

class SubjectController extends Controller
{
    public function store(Request $request)
    {
        $data = $request->validate([
            'name' => 'required|string',
            'section' => 'nullable|string',
            'units' => 'required|integer',
            'required_expertise' => 'nullable|string',
            'days' => 'nullable|string',
            'start_time' => 'nullable|string',
            'end_time' => 'nullable|string'
        ]);

        if (!empty($data['start_time'])) $data['start_time'] = date('H:i:s', strtotime($data['start_time']));
        if (!empty($data['end_time'])) $data['end_time'] = date('H:i:s', strtotime($data['end_time']));

        $subject = Subject::create($data);
        \App\Models\Notification::create([
            'user_id' => $request->user()->id,
            'title' => 'Subject Added',
            'message' => "Successfully added {$subject->name} to the curriculum catalog.",
            'type' => 'success'
        ]);

        return $subject;
    }

    public function index()
    {
        return response()->json(Subject::all());
    }

    public function update(Request $request, Subject $subject)
    {
        $data = $request->validate([
            'name' => 'string',
            'section' => 'nullable|string',
            'units' => 'integer',
            'required_expertise' => 'nullable|string',
            'days' => 'nullable|string',
            'start_time' => 'nullable|string',
            'end_time' => 'nullable|string'
        ]);

        if (!empty($data['start_time'])) $data['start_time'] = date('H:i:s', strtotime($data['start_time']));
        if (!empty($data['end_time'])) $data['end_time'] = date('H:i:s', strtotime($data['end_time']));

        $subject->update($data);
        ActivityLog::create([
            'user_id' => $request->user()->id,
            'action' => 'Updated',
            'type' => 'Curriculum',
            'description' => "Updated subject: {$subject->name}"
        ]);
        return response()->json($subject);
    }

    public function importCsv(Request $request)
    {
        try {
            $request->validate(['file' => 'required|file']);
            $file = $request->file('file');
            $path = $file->getRealPath();
            $handle = fopen($path, 'r');
            
            $header = fgetcsv($handle);
            if (!$header) {
                return response()->json(['message' => 'Invalid or empty CSV file'], 422);
            }
            $map = array_flip($header);

            $subjects = [];
            while (($data = fgetcsv($handle)) !== false) {
                if (empty($data) || count($data) < 1) continue;
                
                $subjects[] = [
                    'name' => $data[$map['name'] ?? $map['subject_name'] ?? 0] ?? null,
                    'section' => $data[$map['section'] ?? 6] ?? '',
                    'units' => (int) ($data[$map['units'] ?? 1] ?? 3),
                    'required_expertise' => $data[$map['required_expertise'] ?? 2] ?? '',
                    'days' => $data[$map['days'] ?? 3] ?? '',
                    'start_time' => !empty($data[$map['start_time'] ?? 4]) ? date('H:i:s', strtotime($data[$map['start_time'] ?? 4])) : null,
                    'end_time' => !empty($data[$map['end_time'] ?? 5]) ? date('H:i:s', strtotime($data[$map['end_time'] ?? 5])) : null,
                    'created_at' => now(),
                    'updated_at' => now(),
                ];
            }
            fclose($handle);

            // Filter out subjects with no name
            $subjects = array_filter($subjects, function($s) { return !empty($s['name']); });

            if (empty($subjects)) {
                return response()->json(['message' => 'No valid subjects found in CSV'], 422);
            }

            // Conflict check removed to allow multiple sections of the same subject.


            foreach ($subjects as $s) {
                Subject::create($s);
            }

            return response()->json(['message' => 'Subjects imported successfully', 'count' => count($subjects)]);
        } catch (\Exception $e) {
            return response()->json(['message' => 'Import Error: ' . $e->getMessage()], 500);
        }
    }

    public function destroy(Request $request, Subject $subject)
    {
        $name = $subject->name;
        $subject->delete();
        ActivityLog::create([
            'user_id' => $request->user()->id,
            'action' => 'Deleted',
            'type' => 'Curriculum',
            'description' => "Removed subject: {$name}"
        ]);
        return response()->json(['message' => 'Subject deleted']);
    }
}
