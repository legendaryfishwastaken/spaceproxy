const address1 = document.getElementById('gointospace');
const address2 = document.getElementById('gointospace2');
const urlPattern = new RegExp(
	'^(https?:\\/\\/)?' +
		'((([a-z\\d]([a-z\\d-]*[a-z\\d])*)\\.)+[a-z]{2,}|' +
		'((\\d{1,3}\\.){3}\\d{1,3}))' +
		'(\\:\\d+)?(\\/[-a-z\\d%_.~+]*)*' +
		'(\\?[;&a-z\\d%_.~+=-]*)?' +
		'(\\#[-a-z\\d_]*)?$',
	'i'
);

const proxySetting =
	localStorage.getItem('dropdown-selected-text-proxy') ??
	'Scramjet';

const swConfig = {
	'Ultraviolet': { 
		type: 'sw',
		file: '/@/sw.js', 
		config: __uv$config,
		func: null
	},
	'Scramjet': {
		type: 'sw',
		file: '/scram/sw.js',
		config: __scramjet$config,
		func: async () => {
			// @ts-ignore
			const { ScramjetController } = $scramjetLoadController();
			const scramjet = new ScramjetController(__scramjet$config);
			await scramjet.init();
			await setTransports();
			console.log('Scramjet Service Worker registered.');
		}
	}
};

const { type: swType, file: swFile, config: swConfigSettings, func: swFunction } = swConfig[proxySetting] ?? {
	type: 'sw',
	file: '/@/sw.js',
	config: __uv$config,
	func: null
};

const connection = new BareMux.BareMuxConnection('/baremux/worker.js');

var defWisp =
	(location.protocol === 'https:' ? 'wss' : 'ws') +
	'://' +
	location.host +
	'/wisp/';
var wispUrl = localStorage.getItem('wisp') || defWisp;

async function setTransports() {
	const transports =
		localStorage.getItem('dropdown-selected-text-transport') || 'Libcurl';
	if (transports === 'Libcurl') {
		await connection.setTransport('/libcurl/index.mjs', [
			{ wisp: wispUrl }
		]);
	} else if (transports === 'Epoxy') {
		await connection.setTransport('/epoxy/index.mjs', [{ wisp: wispUrl }]);
	} else {
		await connection.setTransport('/libcurl/index.mjs', [
			{ wisp: wispUrl }
		]);
	}
}

function search(input) {
	input = input.trim();
	let searchTemplate;

	switch (localStorage.getItem('dropdown-selected-text-searchEngine')) {
		case 'DuckDuckGo (default)':
			searchTemplate = 'https://duckduckgo.com/?q=%s';
			break;
		case 'Bing':
			searchTemplate = 'https://bing.com/search?q=%s';
			break;
		case 'Google':
			searchTemplate = 'https://google.com/search?q=%s';
			break;
		case 'Yahoo!':
			searchTemplate = 'https://search.yahoo.com/search?p=%s';
			break;
		default:
			searchTemplate = 'https://duckduckgo.com/?q=%s';
	}

	if (urlPattern.test(input)) {
		const url = new URL(input.includes('://') ? input : `http://${input}`);
		return url.toString();
	} else {
		return searchTemplate.replace('%s', encodeURIComponent(input));
	}
}

async function registerServiceWorker() {
	if ('serviceWorker' in navigator) {
		try {
			// Execute proxy-specific initialization function if exists
			if (swFunction && typeof swFunction === 'function') {
				await swFunction();
			} else {
				// For non-Scramjet proxies, register the service worker manually
				await navigator.serviceWorker.register(swFile);
				await navigator.serviceWorker.ready;
			}
			
			// Set up transports
			await setTransports();
			
			// Verify transport was set
			const transport = await connection.getTransport();
			if (transport == null) {
				await setTransports();
			}
			
			console.log('Service Worker registered successfully');
		} catch (error) {
			console.error('Service Worker registration failed:', error);
		}
	}
}

// Initialize on load
if (document.readyState === 'loading') {
	document.addEventListener('DOMContentLoaded', registerServiceWorker);
} else {
	registerServiceWorker();
}
