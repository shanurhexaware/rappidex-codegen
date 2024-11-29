import * as vscode from 'vscode';
import axios from 'axios';
import { getAIPoweredBotResponse } from './aiIntegration';

// Typing Effect
async function typeTextInEditor(editor: vscode.TextEditor, text: string) {
    for (let i = 0; i < text.length; i++) {
        // Adjust the delay of text
        await new Promise(resolve => setTimeout(resolve, 30));
        editor.edit(editBuilder => {
            editBuilder.insert(editor.selection.active, text[i]);
        });
    }
}

// Handle user input
async function handleUserInput() {
    const prompt = await vscode.window.showInputBox({
        prompt: "Please enter your prompt"
    });

    // If user cancels the input
    if (prompt === undefined) {
        return;
    }

    // Get active text editor
    const editor = vscode.window.activeTextEditor;

    if (!editor) {
        return;
    }

    // Display loading message
    editor.edit(editBuilder => {
        editBuilder.insert(editor.selection.active, 'Fetching Response ...');
    });

    // Fetch Bot Response
    const botResponse = await getAIPoweredBotResponse(prompt);

    // Remove loading message
    const loadingMessageLength = 'Fetching Response ...'.length;

    editor.edit(editBuilder => {
        editBuilder.delete(
            new vscode.Range(
                editor.selection.active.translate(0, -loadingMessageLength),
                editor.selection.active
            )
        );
    });

    // Simulate typing effect for the bot response
    await typeTextInEditor(editor, botResponse);

    // Display completion
    vscode.window.showInformationMessage('Response received and typed');
}

export function activate(context: vscode.ExtensionContext) {
    console.log('Congratulations, your Rappidex code generation is active');

    let disposable = vscode.commands.registerCommand('extension.getAIPoweredBotResponse', async () => {
        await handleUserInput();
    });
    context.subscriptions.push(disposable);

    let scanCodeDisposable = vscode.commands.registerCommand('extension.scanCode', async () => {
        const editor = vscode.window.activeTextEditor;
        if (editor) {
            const document = editor.document;
            const code = document.getText();

            // Show a progress message
            const progressOptions = {
                location: vscode.ProgressLocation.Notification,
                title: "Analyzing Code...",
                cancellable: true
            };
            vscode.window.withProgress(progressOptions, async (progress, token) => {
                token.onCancellationRequested(() => {
                    console.log("User canceled the code analysis");
                });

                const suggestion = await getCodeSuggestions(code);
                if (suggestion) {
                    // Show the suggestion in the editor
                    showSuggestionInEditor(editor, suggestion, context);
                } else {
                    vscode.window.showInformationMessage('No suggestions available.');
                }
            });
        } else {
            vscode.window.showErrorMessage('No active text editor found.');
        }
    });

    context.subscriptions.push(scanCodeDisposable);

    // Register a command to handle the prompt
    let promptDisposable = vscode.commands.registerCommand('extension.handlePrompt', async () => {
        const editor = vscode.window.activeTextEditor;
        if (editor) {
            const document = editor.document;
            const selection = editor.selection;
            const line = document.lineAt(selection.start.line).text;

            if (line.startsWith('>>prompt ')) {
                const prompt = line.substring(10).trim();
                const response = await getLLMResponse(prompt);
                if (response) {
                    insertResponseInEditor(editor, response);
                }
            }
        }
    });

    context.subscriptions.push(promptDisposable);

    // Listen for text changes and check for Enter key press
    vscode.workspace.onDidChangeTextDocument(event => {
        const editor = vscode.window.activeTextEditor;
        if (editor && event.document === editor.document) {
            const document = editor.document;
            const selection = editor.selection;
            const line = document.lineAt(selection.start.line).text;

            // Check if the line starts with '>>prompt ' and ends with a newline character
            if (line.startsWith('>>prompt ') && line.endsWith('\n')) {
                vscode.commands.executeCommand('extension.handlePrompt');
            }
        }
    });
}

export function deactivate() {}

async function getCodeSuggestions(code: string): Promise<string> {
    try {
        const response = await axios.post("http://localhost:8080/requirementsbits/v1/code_gen/", {
            prompt: `Analyze the following code and suggest improvements:\n${code}`,
        });

        console.log('API Response:', response.data);
        const suggestions = response.data.trim();
        return suggestions;
    } catch (error) {
        console.error('Error fetching code suggestions:', error);
        return '';
    }
}

async function getLLMResponse(prompt: string): Promise<string> {
    try {
        const response = await axios.post("http://localhost:8080/requirementsbits/v1/code_gen/", {
            prompt: `${prompt}`,
        });

        console.log('API Response for prompt:', response.data);
        const suggestions = response.data.trim();
        return suggestions;
    } catch (error) {
        console.error('Error fetching LLM response:', error);
        return '';
    }
}

function showSuggestionInEditor(editor: vscode.TextEditor, suggestion: string, context: vscode.ExtensionContext) {
    const decorationType = vscode.window.createTextEditorDecorationType({
        backgroundColor: 'rgba(255, 255, 0, 0.3)',
        border: '1px solid rgba(255, 255, 0, 0.5)',
        isWholeLine: false,
        rangeBehavior: vscode.DecorationRangeBehavior.ClosedClosed
    });

    const endOfDocument = editor.document.lineAt(editor.document.lineCount - 1).range.end;
    const suggestionRange = new vscode.Range(endOfDocument, endOfDocument.translate(0, suggestion.split('\n').length));

    editor.edit(editBuilder => {
        editBuilder.insert(endOfDocument, `\n\n # Suggested Code:\n${suggestion}`);
    });

    const decoration = { range: suggestionRange, hoverMessage: 'Click to accept or reject' };
    editor.setDecorations(decorationType, [decoration]);

    const acceptCommand = vscode.commands.registerCommand('extension.acceptSuggestion', () => {
        editor.edit(editBuilder => {
            editBuilder.replace(suggestionRange, suggestion);
        });
        editor.setDecorations(decorationType, []);
        vscode.window.showInformationMessage('Suggestion accepted.');
    });

    const rejectCommand = vscode.commands.registerCommand('extension.rejectSuggestion', () => {
        editor.edit(editBuilder => {
            editBuilder.delete(suggestionRange);
        });
        editor.setDecorations(decorationType, []);
        vscode.window.showInformationMessage('Suggestion rejected.');
    });

    context.subscriptions.push(acceptCommand, rejectCommand);

    const autoAccept = vscode.workspace.getConfiguration().get('copilotClone.autoAccept');
    if (autoAccept) {
        vscode.commands.executeCommand('extension.acceptSuggestion');
    } else {
        vscode.window.showInformationMessage('Code suggestion available. Click on the highlighted code to accept or reject.', 'Accept', 'Reject')
            .then(selection => {
                if (selection === 'Accept') {
                    vscode.commands.executeCommand('extension.acceptSuggestion');
                } else if (selection === 'Reject') {
                    vscode.commands.executeCommand('extension.rejectSuggestion');
                }
            });
    }
}

function insertResponseInEditor(editor: vscode.TextEditor, response: string) {
    const endOfDocument = editor.document.lineAt(editor.document.lineCount - 1).range.end;
    editor.edit(editBuilder => {
        editBuilder.insert(endOfDocument, `\n\n// LLM Response:\n${response}`);
    });
}
