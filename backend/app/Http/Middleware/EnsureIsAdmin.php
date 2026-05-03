<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;

class EnsureIsAdmin
{
    public function handle(Request $request, Closure $next)
    {
        if ($request->user() && $request->user()->role === 'ADMIN') {
            return $next($request);
        }

        return response()->json(['message' => 'Forbidden: Admin access required.'], 403);
    }
}
