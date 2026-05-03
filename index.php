<?php
/**
 * Art ATLAS - Modernization Portal
 * This file acts as a shortcut to access both the API and the Frontend.
 */

$baseUrl = (isset($_SERVER['HTTPS']) && $_SERVER['HTTPS'] === 'on' ? "https" : "http") . "://$_SERVER[HTTP_HOST]" . dirname($_SERVER['PHP_SELF']);
$baseUrl = rtrim($baseUrl, '/');

?>
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Art ATLAS Portal</title>
    <style>
        body {
            font-family: 'Inter', system-ui, -apple-system, sans-serif;
            background: #0f172a;
            color: #f8fafc;
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            min-height: 100vh;
            margin: 0;
        }
        .container {
            background: rgba(30, 41, 59, 0.7);
            backdrop-filter: blur(12px);
            border: 1px solid rgba(255, 255, 255, 0.1);
            padding: 3rem;
            border-radius: 24px;
            text-align: center;
            box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.5);
            max-width: 500px;
            width: 90%;
        }
        h1 {
            font-size: 2.5rem;
            margin-bottom: 0.5rem;
            background: linear-gradient(to right, #38bdf8, #818cf8);
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
        }
        p {
            color: #94a3b8;
            margin-bottom: 2rem;
        }
        .links {
            display: flex;
            flex-direction: column;
            gap: 1rem;
        }
        .btn {
            padding: 1rem;
            border-radius: 12px;
            text-decoration: none;
            font-weight: 600;
            transition: all 0.2s;
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 0.5rem;
        }
        .btn-api {
            background: rgba(56, 189, 248, 0.1);
            border: 1px solid rgba(56, 189, 248, 0.2);
            color: #38bdf8;
        }
        .btn-web {
            background: linear-gradient(to right, #38bdf8, #818cf8);
            color: white;
        }
        .btn:hover {
            transform: translateY(-2px);
            opacity: 0.9;
        }
        .status {
            margin-top: 2rem;
            font-size: 0.875rem;
            color: #64748b;
        }
    </style>
</head>
<body>
    <div class="container">
        <h1>Art ATLAS</h1>
        <p>Teacher Load Auto Assignment System <br> (Modernized Edition)</p>
        
        <div class="links">
            <a href="http://localhost:5173" target="_blank" class="btn btn-web">
                🚀 Launch React Frontend
            </a>
            <a href="<?php echo $baseUrl; ?>/backend/public/api/teachers" target="_blank" class="btn btn-api">
                📡 Access Laravel API
            </a>
        </div>

        <div class="status">
            Note: Ensure both <strong>MySQL</strong> is running in XAMPP <br>
            and you have run the <code>npm run dev</code> command.
        </div>
    </div>
</body>
</html>
