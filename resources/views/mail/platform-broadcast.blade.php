<!DOCTYPE html>
<html lang="ru">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>{{ $subjectLine }}</title>
</head>
<body style="margin:0;padding:0;background:#f4f5f7;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f4f5f7;padding:24px 12px;">
        <tr>
            <td align="center">
                <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:600px;background:#ffffff;border-radius:16px;">
                    <tr>
                        <td style="padding:32px 32px 8px;font:700 18px/1.3 Arial,sans-serif;color:#1d1f24;">{{ config('app.name') }}</td>
                    </tr>
                    <tr>
                        <td style="padding:8px 32px 32px;font:400 15px/1.6 Arial,sans-serif;color:#1d1f24;">
                            {!! $bodyHtml !!}
                        </td>
                    </tr>
                </table>
            </td>
        </tr>
    </table>
</body>
</html>
