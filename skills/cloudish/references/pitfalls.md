# Common Pitfalls

- **Problem:** The build succeeds but the URL returns errors.
  **Solution:** The server is probably bound to `localhost` or a different port. Bind to `0.0.0.0` on the `port` you sent, then redeploy.
- **Problem:** Postgres fails on restart with a socket error.
  **Solution:** Recreate `/var/run/postgresql` on container start and run `initdb` only when the data directory on the volume is empty.
- **Problem:** A second run creates a new key and an empty project.
  **Solution:** The key was not saved. Use the project’s approved secret store after creating a key.

Adapted from Cloudish's public skill (https://github.com/cloudishai/skills, MIT).
