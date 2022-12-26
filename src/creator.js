// Types
import { create } from 'create-svelte';
import process from 'process';
import { spawnSync } from 'node:child_process';
import fs from 'fs-extra';
import path from 'path';
import { dist, whichPMRuns, mkdirp } from './utils.js';
import { bold, red, cyan } from 'kleur/colors';

// NOTE: Any changes here must also be reflected in the --help output in utils.js and shortcut expansions in index.js.
// Probably a good idea to do a search on the values you are changing to catch any other areas they are used in

export class SkeletonOptions {
	// svelte-create expects these options, do not change the names or values.
	name = 'new-skel-app';
	template = 'skeleton';
	types = 'typescript';
	prettier = true;
	eslint = true;
	playwright = false;
	vitest = false;
	inspector = false;

	// create-skeleton-app additions
	_ = []; //catch all for extraneous params from mri, used to capture project name.
	help = false;
	quiet = false;
	path = '.';
	forms = false;
	typography = false;
	lineclamp = false;
	skeletontheme = 'skeleton';
	skeletontemplate = 'bare';
	packagemanager = 'npm';
	// props below are private to the Skeleton team
	verbose = false;
	monorepo = false;
	packages = [];
	skeletonui = true;
	skeletontemplatedir = '../templates';
	workspace = '';
}

export async function createSkeleton(opts) {
	//create-svelte will happily overwrite an existing directory, foot guns are bad mkay
	opts.path = path.resolve(
		opts?.path,
		opts.name.replace(/\s+/g, '-').toLowerCase(),
	);

	if (fs.existsSync(opts.path) && fs.readdirSync(opts.path).length != 0) {
		console.error(red(bold('Install directory already exists!')));
		process.exit();
	}

	if (!(opts?.quiet)) {
		console.log('Working: Creating base SvelteKit install.');
	}
	fs.mkdirp(opts.path);

	//create-svelte will build the base install for us
	create(opts.path, opts);
	process.chdir(opts.path);

	// install packages
	opts.packagemanager = whichPMRuns()?.name || 'npm';

	// the order matters due to dependency resolution, because yarn
	let packages = [
		'postcss',
		'autoprefixer',
		'tailwindcss',
		'svelte-preprocess',
		'@skeletonlabs/skeleton',
	];

	if (opts?.prettier) packages.push('prettier-plugin-tailwindcss');

	if (opts?.typography) packages.push('@tailwindcss/typography');
	if (opts?.forms) packages.push('@tailwindcss/forms');
	if (opts?.lineclamp) packages.push('@tailwindcss/line-clamp');

	if (!(opts?.quiet)) {
		console.log('Working: Installing project dependencies.');
	}

	let result = spawnSync(opts.packagemanager, ['add', '-D', ...packages], {
		shell: true,
	});

	// Capture any errors from stderr and display for the user to report it to us
	if (result?.stderr.toString().length) {
		console.log(red(bold(
			'The following was reported to stderr - please read carefully to determine whether it actually affects your install:\n')),
			result?.stderr.toString()
		);
		// process.exit();
	}

	// Just to help with any user error reports
	if (opts.verbose) {
		const stdout = result?.stdout.toString();
		if (stdout.length) console.log(bold(cyan('stdout:')), stdout);
		const stderr = result?.stderr.toString();
		if (stderr.length) console.log(bold(red('stderr:')), stderr);
	}

	// write out config files
	out('svelte.config.js', createSvelteConfig(opts));
	out('tailwind.config.cjs', createTailwindConfig(opts));
	out('postcss.config.cjs', createPostCssConfig());

	// add vite.server.fs.allow of skeleton path for sites in monorepo
	if (opts.monorepo) {
		createViteConfig(opts)
	}

	out(
		path.resolve(process.cwd(), 'src/routes/', '+layout.svelte'),
		createSvelteKitLayout(opts),
	);
	out(
		path.resolve(process.cwd(), 'src/', 'app.postcss'),
		'/*place global styles here */',
	);

	// copy over selected template
	copyTemplate(opts);
	mkdirp(path.join('src', 'lib'))
	return opts;
}

function createSvelteConfig(opts) {
	let inspectorConfig = ''
	if (opts.inspector == true) {
		inspectorConfig = `
	vitePlugin: {
		experimental: {
			inspector: {
				holdMode: true,
			}
		}
	}		
`
	}
	const str = `import adapter from '@sveltejs/adapter-auto';
import preprocess from "svelte-preprocess";

/** @type {import('@sveltejs/kit').Config} */
const config = {
	kit: {
		adapter: adapter()
	},
	preprocess: [
		preprocess({
			postcss: true,
		}),
	],${inspectorConfig}
};

export default config;
`;
	return str;
}

function createTailwindConfig(opts) {
	let plugins = [];
	if (opts.forms == true) plugins.push(`require('@tailwindcss/forms')`);
	if (opts.typography == true)
		plugins.push(`require('@tailwindcss/typography')`);
	if (opts.lineclamp == true)
		plugins.push(`require('@tailwindcss/line-clamp')`);
	plugins.push(`require('@skeletonlabs/skeleton/tailwind/theme.cjs')`);

	const str = `/** @type {import('tailwindcss').Config} */
module.exports = {
	darkMode: 'class',
	content: ['./src/**/*.{html,js,svelte,ts}', require('path').join(require.resolve('@skeletonlabs/skeleton'), '../**/*.{html,js,svelte,ts}')],
	theme: {
		extend: {},
	},
	plugins: [${plugins.join(',')}],
}
`;
	return str;
}

function createPostCssConfig() {
	const str = `module.exports = {
	plugins: {
		tailwindcss: {},
		autoprefixer: {},
	},
}`;
	return str;
}
// TODO - this is for monorepos only, need to see everything that needs to be modified for monorepos
// currently packages are automatically added as a workspace reference if in a mono
function createViteConfig(opts) {

	let filename = '';
	if (opts.types == 'typescript') {
		filename = 'vite.config.ts'
	} else {
		filename = 'vite.config.js'
	}
	let vite = fs.readFileSync(filename)
	const insertString = `,
	server: {
		fs: {
			allow: ['../../packages/skeleton/']
		}
	}`
	const token = 'kit()]'
	const insertPoint = vite.indexOf(token) + token.length
	const str = vite.slice(0, insertPoint) + insertString + vite.slice(insertPoint)
	fs.writeFileSync(filename, str)
}


function createSvelteKitLayout(opts) {
	const str = `<script${opts.types == 'typescript' ? ` lang='ts'` : ''}>
	import '@skeletonlabs/skeleton/themes/theme-${opts.skeletontheme}.css';
	import '@skeletonlabs/skeleton/styles/all.css';
	import '../app.postcss';
</script>
<slot/>`;
	return str;
}

function copyTemplate(opts) {
	const src = path.resolve(
		dist(opts.skeletontemplatedir),
		opts.skeletontemplate,
	);

	fs.copySync(src + '/src', './src', { overwrite: true });
	fs.copySync(src + '/static', './static', { overwrite: true });

	// patch back in their theme choice - it may have been replaced by the theme template, it may still be the correct auto-genned one, depends on the template - we don't care, this fixes it.
	let content = fs.readFileSync('./src/routes/+layout.svelte', {
		encoding: 'utf8',
		flag: 'r',
	});
	const reg = /theme-.*\.css';$/gim;
	fs.writeFileSync(
		'./src/routes/+layout.svelte',
		content.replace(reg, `theme-${opts.skeletontheme}.css';`),
	);
	// update the <body> to have the data-theme
	content = fs.readFileSync('./src/app.html', { encoding: 'utf8', flag: 'r' });
	fs.writeFileSync(
		'./src/app.html',
		content.replace('<body>', `<body data-theme="${opts.skeletontheme}">`),
	);
}

function out(filename, data) {
	fs.writeFileSync(filename, data);
}
