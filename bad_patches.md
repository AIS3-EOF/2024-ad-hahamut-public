# 1

```javascript
router.post(
	'/profile/:id/profile_picture',
	loginRequired,
	upload.single('profile_picture_upload'),
	async (req, res) => {

	if (req.session.user.id !== 1 && req.session.user.id !== req.params.id) {
			res.redirect(`/profile/${req.params.id}`)
			return;
	}
	// ...
});
```

This brokes profile upload because `req.session.user.id` is a number but `req.params.id` is a string, so the user can't upload a profile picture even if it is his own profile.

# 2

```javascript
for (const tbl of ['boards', 'categories', 'threads', 'posts', 'users']) {
    if (backup[tbl]) {
        await fs.writeFile(path.join(tmpdir, tbl + '.json'), JSON.stringify(sql(`SELECT * FROM ${tbl}`).all()))
    }
}
```

patched to:

```javascript
for (const tbl of ['boards', 'categories', 'threads', 'posts', 'users']) {
    if (backup[tbl]) {
        await fs.writeFile(path.join(tmpdir, tbl + '.json'), JSON.stringify(sql`SELECT * FROM ${tbl}`.all()))
    }
}
```

This brokes the backup because table name can't be parameterized in prepared statement.
