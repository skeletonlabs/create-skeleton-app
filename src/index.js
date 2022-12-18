#!/usr/bin/env node
import { SkeletonOptions, createSkeleton } from './creator.js';
import fs from 'fs-extra';
import mri from 'mri';
import prompts from 'prompts';
import { bold, cyan, gray, grey, red } from 'kleur/colors';
import { dist, getHelpText } from './utils.js';
import path from 'path';

async function main() {
	// grab any passed arguments from the command line
	let opts = await parseArgs();

	if ('quiet' in opts) {
		// in quiet mode we prefill the defaults, then overlay the passed options and bypass all of askForMissingParams so that it
		// doesn't have to constantly check for quietmode all the time.
		let defaults = new SkeletonOptions();
		opts = Object.assign(defaults, opts);
	} else {
		// in interactive mode we ask the user to fill anything not passed in
		opts = await askForMissingParams(opts);
	}

	// Now that we have all of the options, lets create it.
	await createSkeleton(opts);

	// And give the user some final information on what to do Next
	if (!(opts?.quiet)) {
		const pm = opts.packagemanager;
		let runString = `${pm} dev\n`;

		if (pm == 'npm') {
			runString = 'npm run dev\n';
		}
		let finalInstructions = bold(cyan(`\nDone! You can now:\n\n`));
		if (process.cwd() != opts.path) {
			finalInstructions += bold(cyan(`cd ${path.relative(process.cwd() + '/..', pathToInstall)}\n`));
		}
		finalInstructions += bold(cyan(runString))
		finalInstructions += grey(`Need some help or found an issue? Visit us on Discord https://discord.gg/EXqV7W8MtY`);
		console.log(finalInstructions);
	}
	process.exit();
}

async function parseArgs() {
	const argv = process.argv.slice(2);

	// mri will parse argv and expand any shorthand args.  Accepted args are the literal props of SkelOptions
	const opts = mri(argv, {
		alias: {
			h: 'help',
			n: 'name',
			p: 'path',
			t: 'skeletontheme',
			m: 'monorepo',
			q: 'quiet',
			v: 'verbose',
		},
		boolean: [
			'help',
			'quiet',
			'monorepo',
			'skeletonui',
			'prettier',
			'eslint',
			'playwright',
			'forms',
			'typography',
			'lineclamp',
			'verbose',
			'vitest',
			'inspector'
		],
	});

	// If a user invokes 'create-app blah foo', it falls into the _ catch all list, the best we can do is take the first one and use that as the name
	// if args are passed in incorrectly such as --prettier=0 instead of --prettier=false then a 0 will be added to the _ collection, we check that the
	// first one isn't a bungled arg set to 0
	if (opts._.length && opts._[0] != 0) {
		opts.name = opts._[0];
	}
	// Show help if specified regardless of how many other options are specified, have fun updating the text string in utils.ts :(
	if ('help' in opts) {
		console.log(getHelpText());
		process.exit();
	}
	return opts;
}

export async function askForMissingParams(opts) {
	// prettier-ignore
	const disclaimer = `
${bold(cyan('Welcome to Skeleton 💀! A UI tookit for Svelte + Tailwind'))}

${bold(red('This is BETA software; expect bugs and missing features.'))}

Problems? Open an issue on ${cyan('https://github.com/skeletonlabs/skeleton/issues')} if none exists already.
`;

	const { version } = JSON.parse(
		fs.readFileSync(dist('../package.json'), 'utf-8'),
	);

	console.log(gray(`\ncreate-skeleton-app version ${version}`));
	console.log(disclaimer);

	const questions = [];

	//NOTE: When doing checks here, make sure to test for the presence of the prop, not the prop value as it may be set to false deliberately.

	if (!('name' in opts)) {
		questions.push({
			type: 'text',
			name: 'name',
			message: 'Name for your new project:',
		});
	}

	if (!('types' in opts)) {
		const q = {
			type: 'select',
			name: 'types',
			message: 'Add type checking with TypeScript?',
			initial: false,
			choices: [
				{
					title: 'Yes, using JavaScript with JSDoc comments',
					value: 'checkjs',
				},
				{
					title: 'Yes, using TypeScript syntax',
					value: 'typescript',
				},
				{ title: 'No', value: null },
			],
		};
		questions.push(q);
	}

	if (!('eslint' in opts)) {
		const q = {
			type: 'toggle',
			name: 'eslint',
			message: 'Add ESLint for code linting?',
			initial: false,
			active: 'Yes',
			inactive: 'No',
		};
		questions.push(q);
	}

	if (!('prettier' in opts)) {
		const q = {
			type: 'toggle',
			name: 'prettier',
			message: 'Add Prettier for code formatting?',
			initial: false,
			active: 'Yes',
			inactive: 'No',
		};
		questions.push(q);
	}

	if (!('playwright' in opts)) {
		const q = {
			type: 'toggle',
			name: 'playwright',
			message: 'Add Playwright for browser testing?',
			initial: false,
			active: 'Yes',
			inactive: 'No',
		};
		questions.push(q);
	}

	if (!('vitest' in opts)) {
		const q = {
			type: 'toggle',
			name: 'vitest',
			message: 'Add Vitest for unit testing?',
			initial: false,
			active: 'Yes',
			inactive: 'No'
		}
		questions.push(q);
	}

	if (!('inspector' in opts)) {
		const q = {
			type: 'toggle',
			name: 'inspector',
			message: 'Activate the experimental inspector?',
			initial: false,
			active: 'Yes',
			inactive: 'No'
		}
		questions.push(q);
	}

	// Tailwind Plugin Selection
	if (!(['forms', 'typography', 'lineclamp'].every(value => { return Object.keys(opts).includes(value) }))) {
		const q = {
			type: 'multiselect',
			name: 'twplugins',
			message: 'Pick tailwind plugins to add:',

			choices: [
				{ title: 'forms', value: 'forms', selected: opts?.forms },
				{ title: 'typography', value: 'typography', selected: opts?.typography },
				{ title: 'line-clamp', value: 'lineclamp', selected: opts?.lineclamp },
			],
		};
		questions.push(q);
	}

	// Skeleton Theme Selection
	if (!('skeletontheme' in opts)) {
		const q = {
			type: 'select',
			name: 'skeletontheme',
			message: 'Select a theme:',
			initial: 0,
			choices: [
				{ title: 'Skeleton', value: 'skeleton' },
				{ title: 'Modern', value: 'modern' },
				{ title: 'Hamlindigo', value: 'hamlindigo' },
				{ title: 'Rocket', value: 'rocket' },
				{ title: 'Sahara', value: 'sahara' },
				{ title: 'Gold Nouveau', value: 'gold-nouveau' },
				{ title: 'Vintage', value: 'vintage' },
				{ title: 'Seafoam', value: 'seafoam' },
				{ title: 'Crimson', value: 'crimson' },
			],
		};
		questions.push(q);
	}

	//Skeleton Template Selection
	if (!('skeletontemplate' in opts)) {
		// need to check whether a templatedir has been passed in (might be from a script in package.json pointing to real template projects)
		const templateDir = opts.skeletontemplatedir || '../templates';
		let parsedChoices = [];
		fs.readdirSync(dist(templateDir)).forEach((dir) => {
			const meta_file = dist(`${templateDir}/${dir}/meta.json`);
			const { position, title, description, enabled } = JSON.parse(
				fs.readFileSync(meta_file, 'utf8'),
			);
			if (enabled) {
				parsedChoices.push({
					position,
					title,
					description,
					value: dir,
				});
			}
		});
		parsedChoices.sort((a, b) => a.position - b.position);
		const q = {
			type: 'select',
			name: 'skeletontemplate',
			message: 'Which Skeleton app template?',
			choices: parsedChoices,
		};
		questions.push(q);
	}

	const onCancel = () => {
		console.log('Exiting');
		process.exit();
	};

	// Get user responses to missing args
	//@ts-ignore
	const response = await prompts(questions, { onCancel });

	//Prompts returns the twplugins as an array, but it makes it easier to use on the command line if they are seperated booleans
	//We map them out from the array here and delete the now useless twplugins prop before proceeding to overlay the response values onto opts
	//@ts-ignore
	if (response.twplugins != undefined) Object.keys(response.twplugins).forEach((index) => (opts[response.twplugins[index]] = true));
	delete response.twplugins;
	Object.assign(opts, response);
	const skelOpts = new SkeletonOptions();
	Object.assign(skelOpts, opts);

	return skelOpts;
}
main();
