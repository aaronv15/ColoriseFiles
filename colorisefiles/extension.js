const vscode = require('vscode');
const minimatch = require('minimatch');

function ColorDecorationProvider() {
	this._onDidChangeFileDecorations = new vscode.EventEmitter();
	this.onDidChangeFileDecorations = this._onDidChangeFileDecorations.event;

	vscode.workspace.onDidChangeConfiguration((e) => {
		if (e.affectsConfiguration('coloriseFiles.patterns')) {
			this._onDidChangeFileDecorations.fire(undefined);
		}
	});
}

ColorDecorationProvider.prototype.provideFileDecoration = function (uri) {
	const config = vscode.workspace.getConfiguration('coloriseFiles');
	if (!config) {
		return;
	}
	const patterns = config.get('patterns', []);

	for (const item of patterns) {
		if (minimatch.minimatch(uri.fsPath, item.glob)) {
			return new vscode.FileDecoration(undefined, undefined, new vscode.ThemeColor(item.color));
		}
	}
	return undefined;
};

function activate(context) {
	console.log('"colorisefiles" is now active');

	const provider = new ColorDecorationProvider();
	context.subscriptions.push(vscode.window.registerFileDecorationProvider(provider));
	context.subscriptions.push(provider.onDidChangeFileDecorations);

	context.subscriptions.push(vscode.workspace.onDidSaveTextDocument((document) => {
		if (document.uri.path.endsWith('/.vscode/settings.json')) {
			const config = vscode.workspace.getConfiguration('coloriseFiles');
			const patterns = config.get('patterns', []);
			patterns.forEach(pattern => {
				vscode.workspace.findFiles(pattern.glob, '**/node_modules/**').then(files => {
					files.forEach(file => {
						provider.provideFileDecoration(file);
					});
				});
			});
		} else {
			provider.provideFileDecoration(document.uri);
		}
	}));

	context.subscriptions.push(vscode.workspace.onDidChangeWorkspaceFolders(() => {
		const config = vscode.workspace.getConfiguration('coloriseFiles');
		const patterns = config.get('patterns', []);
		patterns.forEach(pattern => {
			vscode.workspace.findFiles(pattern.glob, '**/node_modules/**').then(files => {
				files.forEach(file => {
					provider.provideFileDecoration(file);
				});
			});
		});
	}));
}

function deactivate() { }

module.exports = {
	activate,
	deactivate
};
