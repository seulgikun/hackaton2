<?php

namespace App\Http\Controllers;

use App\Models\Teacher;
use App\Models\ActivityLog;
use Illuminate\Http\Request;

class TeacherController extends Controller
{
    public function index()
    {
        return response()->json(Teacher::all());
    }

    public function store(Request $request)
    {
        $data = $request->validate([
            'name' => 'required|string',
            'email' => 'required|email|unique:users',
            'password' => 'required|string|min:6',
            'expertise' => 'nullable|string',
            'max_units' => 'nullable|integer'
        ]);

        $user = \App\Models\User::create([
            'name' => $data['name'],
            'email' => $data['email'],
            'password' => \Illuminate\Support\Facades\Hash::make($data['password']),
            'role' => 'TEACHER',
        ]);

        $teacher = Teacher::create([
            'user_id' => $user->id,
            'name' => $data['name'],
            'expertise' => array_filter(array_map('trim', explode(';', $data['expertise'] ?? ''))),
            'available_times' => [],
            'availability_details' => [],
            'max_units' => $data['max_units'] ?? 12
        ]);

        \App\Models\ActivityLog::create([
            'user_id' => $request->user()->id,
            'action' => 'Created',
            'type' => 'Faculty',
            'description' => "Registered new faculty member: {$data['name']}"
        ]);

        \App\Models\Notification::create([
            'user_id' => $request->user()->id,
            'title' => 'Faculty Registered',
            'message' => "Successfully added {$data['name']} to the faculty registry.",
            'type' => 'success'
        ]);

        return $teacher;
    }

    public function update(Request $request, Teacher $teacher)
    {
        $data = $request->validate([
            'name' => 'required|string',
            'email' => 'required|email|unique:users,email,'.($teacher->user_id ?? 0),
            'password' => 'nullable|min:6',
            'expertise' => 'nullable|string',
            'max_units' => 'required|integer',
        ]);

        $teacher->update([
            'name' => $data['name'],
            'expertise' => array_filter(array_map('trim', explode(';', $data['expertise'] ?? ''))),
            'max_units' => $data['max_units']
        ]);

        if ($teacher->user) {
            $userUpdate = ['name' => $data['name'], 'email' => $data['email']];
            if (!empty($data['password'])) {
                $userUpdate['password'] = \Illuminate\Support\Facades\Hash::make($data['password']);
            }
            $teacher->user->update($userUpdate);
        }

        \App\Models\ActivityLog::create([
            'user_id' => $request->user()->id,
            'action' => 'Updated',
            'type' => 'Faculty',
            'description' => "Updated faculty record and credentials for: {$teacher->name}"
        ]);

        return response()->json($teacher->load('user'));
    }

    public function importCsv(Request $request)
    {
        $request->validate(['file' => 'required|file']);
        $file = $request->file('file');
        $path = $file->getRealPath();
        $handle = fopen($path, 'r');
        
        $header = fgetcsv($handle);
        if (!$header) return response()->json(['message' => 'Invalid or empty CSV file'], 422);
        $map = array_flip($header);

        $count = 0;
        while (($data = fgetcsv($handle)) !== false) {
            if (empty($data)) continue;

            $name = trim($data[$map['name'] ?? 0] ?? '');
            $email = trim($data[$map['email'] ?? 1] ?? '');
            $password = trim($data[$map['password'] ?? 2] ?? 'password123');
            $expertise = trim($data[$map['expertise'] ?? 3] ?? '');
            $maxUnits = trim($data[$map['max_units'] ?? 4] ?? 12);

            if (!$name || !$email) continue;

            // 1. Create or update User Account
            $user = \App\Models\User::updateOrCreate(
                ['email' => $email],
                [
                    'name' => $name,
                    'password' => \Illuminate\Support\Facades\Hash::make($password),
                    'role' => 'TEACHER'
                ]
            );

            // 2. Create or update Teacher Profile
            Teacher::updateOrCreate(
                ['user_id' => $user->id],
                [
                    'name' => $name,
                    'expertise' => array_filter(array_map('trim', explode(';', $expertise))),
                    'max_units' => (int)$maxUnits,
                ]
            );
            $count++;
        }
        fclose($handle);

        \App\Models\ActivityLog::create([
            'user_id' => $request->user()->id,
            'action' => 'Imported',
            'type' => 'Faculty',
            'description' => "Batch imported {$count} faculty members via CSV."
        ]);

        \App\Models\Notification::create([
            'user_id' => $request->user()->id,
            'title' => 'Batch Import Successful',
            'message' => "Successfully imported {$count} faculty members and created their login accounts.",
            'type' => 'success'
        ]);

        return response()->json(['message' => 'Teachers imported successfully', 'count' => $count]);
    }

    public function updateProfile(Request $request)
    {
        $user = $request->user();
        if ($user->role !== 'TEACHER') {
            return response()->json(['error' => 'Unauthorized'], 403);
        }

        $teacher = $user->teacher;
        $data = $request->validate([
            'expertise' => 'array',
            'available_times' => 'array',
        ]);

        // Convert string schedules to structured details for the AI
        $details = [];
        foreach ($data['available_times'] ?? [] as $timeStr) {
            if (preg_match("/^(\w+)\s*(\d{1,2}:\d{2})\s*-\s*(\d{1,2}:\d{2})/", $timeStr, $matches)) {
                $details[] = [
                    'day' => $matches[1],
                    'start_time' => $matches[2],
                    'end_time' => $matches[3]
                ];
            }
        }
        $data['availability_details'] = $details;

        $teacher->update($data);
        ActivityLog::create([
            'user_id' => $user->id,
            'action' => 'Updated',
            'type' => 'Faculty',
            'description' => "Updated profile and availability for {$teacher->name}"
        ]);
        return response()->json($teacher->load('user'));
    }

    public function destroy(Request $request, \App\Models\Teacher $teacher)
    {
        $name = $teacher->name;
        $user = $teacher->user;
        $teacher->delete();
        if ($user) $user->delete();
        ActivityLog::create([
            'user_id' => $request->user()->id,
            'action' => 'Deleted',
            'type' => 'Faculty',
            'description' => "Removed faculty member: {$name}"
        ]);
        return response()->json(['message' => 'Teacher deleted']);
    }
}
