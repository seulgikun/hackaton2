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

        $teacher->update($data);
        return response()->json($teacher);
    }
