<?php

namespace App\Http\Controllers;

use App\Models\User;
use App\Models\Teacher;
use App\Models\Subject;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\ValidationException;

class AuthController extends Controller
{
    protected $riskService;

    public function __construct(\App\Services\RiskDetectionService $riskService)
    {
        $this->riskService = $riskService;
    }

    public function register(Request $request)
    {
        $request->validate([
            'name' => 'required|string',
            'email' => 'required|email|unique:users',
            'password' => 'required|min:6',
        ]);

        $user = User::create([
            'name' => $request->name,
            'email' => $request->email,
            'password' => Hash::make($request->password),
            'role' => 'TEACHER',
        ]);

        if ($user->role === 'TEACHER') {
            $user->teacher()->firstOrCreate([], [
                'name' => $user->name,
                'expertise' => [],
                'available_times' => [],
                'availability_details' => [],
                'max_units' => 12
            ]);
        }

        $user->load(['teacher.assignments.subject']);

        return response()->json([
            'user' => $user,
            'token' => $user->createToken('auth_token')->plainTextToken
        ]);
    }

    public function login(Request $request)
    {
        $request->validate([
            'email' => 'required|email',
            'password' => 'required',
        ]);

        $user = User::where('email', $request->email)->first();

        if (!$user || !Hash::check($request->password, $user->password)) {
            throw ValidationException::withMessages([
                'email' => ['Invalid credentials.'],
            ]);
        }

        if ($user->role === 'TEACHER') {
            // Ensure teacher record exists even if created via old seeder/logic
            $user->teacher()->firstOrCreate([], [
                'name' => $user->name,
                'expertise' => [],
                'available_times' => [],
                'availability_details' => [],
                'max_units' => 12
            ]);
            $user->load(['teacher.assignments.subject']);
        }

        return response()->json([
            'user' => $user,
            'token' => $user->createToken('auth_token')->plainTextToken
        ]);
    }

    public function logout(Request $request)
    {
        $request->user()->currentAccessToken()->delete();
        return response()->json(['message' => 'Logged out']);
    }

    public function profile(Request $request)
    {
        $user = $request->user();
        if ($user->role === 'TEACHER') {
            $user->load(['teacher.assignments.subject']);
            
            // Enrich with AI Risks on the fly
            if ($user->teacher) {
                $teachers = Teacher::all()->toArray();
                $subjects = Subject::all()->toArray();
                
                $assignments = $user->teacher->assignments->map(function($a) {
                    return [
                        'id' => $a->id,
                        'teacher_id' => $a->teacher_id,
                        'subject_id' => $a->subject_id,
                        'subject' => $a->subject ? $a->subject->name : 'Unknown',
                        'units' => $a->subject ? $a->subject->units : 0,
                        'days' => $a->subject ? $a->subject->days : '',
                        'section' => $a->subject ? $a->subject->section : '',
                        'start_time' => $a->subject ? $a->subject->start_time : '',
                        'end_time' => $a->subject ? $a->subject->end_time : '',
                        'status' => $a->status,
                        'assignment_reason' => $a->assignment_reason,
                        'score_breakdown' => $a->score_breakdown
                    ];
                })->toArray();

                $enriched = $this->riskService->detectRisks($assignments, $teachers, $subjects);
                
                // Attach back to user object
                $user->teacher->setAttribute('enriched_assignments', $enriched);
            }
        }
        return response()->json($user);
    }
    public function updateCredentials(Request $request)
    {
        $user = $request->user();
        $data = $request->validate([
            'email' => 'required|email|unique:users,email,'.$user->id,
            'password' => 'nullable|min:6',
        ]);

        $user->email = $data['email'];
        if (!empty($data['password'])) {
            $user->password = Hash::make($data['password']);
        }
        $user->save();

        return response()->json(['message' => 'Credentials updated successfully', 'user' => $user]);
    }
}
