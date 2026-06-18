UPDATE tip_sites
SET sender_status = 'active',
    login_url = 'https://soil.urmaustralia.com.au/',
    notes = 'First Cloudflare Browser Run sender.',
    updated_at = datetime('now')
WHERE id = 'urm';
