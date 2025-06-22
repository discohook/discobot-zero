# Discobot Zero

This is the code for the Discobot#9898 bot account (which can no longer be invited) as of the 2024 [New Discohook](https://discohook.app/guide/changelogs/new-discohook) update. Discobot was deprecated in favor of Discohook Utils, but due to lack of 100% overlap, this bot must stay online to serve reaction roles. [Read more here.](https://discohook.app/guide/deprecated/migrate-utils)

## Environment

```py
APPLICATION_ID  # bot app id (i.e. discobot)
DISCORD_TOKEN   # bot token
MIGRATE_ID      # migrate to this app id (i.e. utils)
DATABASE_URL    # psql server
```

## Scripts

These scripts are not meant to be run more than once and so they are not given names in the `package.json`. Make sure you understand what they will be doing since they can be quite destructive.

- `tsx scripts/migrate.ts` - reads a list of rows in `scripts/reaction_roles.sql` and imports the data into the production database. must be compliant with the `reaction_roles` schema.
- `tsx scripts/prune.ts` - starts a long-running process to read every entry in `DiscordGuild` without a name (its `name` is `Unknown Server` and it has no other values - this is not foolproof but it's a fine filter), check if it has any reaction roles, then check if it has any webhooks. If it has neither, the bot will leave the server to reduce the number of events .
