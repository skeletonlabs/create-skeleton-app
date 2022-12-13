Just a quick brain dump from some investigations into the CLI installing dependent packages:

Initially we `<pm> add <depPackage>` and reported anything received on the console's stderr and aborted install. However, this is unreliable as some package managers report things like package deprecation notices on stderr that don't impact the install in any way. e.g.
`warning svelte-check > svelte-preprocess > magic-string > sourcemap-codec@1.4.8: Please use @jridgewell/sourcemap-codec instead`

To stop these false errors, the latest version just didn't report anything from stderr. But this let through things that were an actual error such as the upgrade to Vite 4, which was eventually resolved upstream.

The desired resolution would be to just insert the package names into package.json and let the end dev then run `<pm> install` and assess any output as per normal.

However, getting the latest appropriate version number is problematic:
- you can not just add a package name with an empty version, the package managers just ignore it entirely
- doing a `<pm> add <depPackage>`, which would fetch the version number for us, triggers an install anyways, rather than just adding an entry to package.json
- trying to get the latest version of a package from the npmjs REST endpoints gets a massive payload including lists of exports, previous versions, file listings.
- trying to get the latest tag from gh is much easier, but there is no guarantee that a release tag corresponds to an npm package version number
- even if we did get a version number efficiently, there is no guarantee that it is error free, especially with SK being pre 1.0, semantic versioning rules are not applicable.
- Svelte Kit team seem to be manually updating their dependency version numbers - they would be far more impacted by their deps than us and for us to do this would create a maintenance burden for us.

So in light of all this, i'm going to revert things to how they were originally, but without aborting the install if we do see things on stderr. In a few days, all dependencies will be > 1.0 so we should hopefully see even less of the breaking changes (which have been minimal so far). This is clearly dependent on feedback from devs and any future incidents that arise (or even any other strategies proposed by others)