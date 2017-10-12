'use strict';

import * as vscode from 'vscode';

// use this to easily determine if brackets are unbalanced (and in need of commenting)
var balanced = require('node-balanced');

// use this to easily find the closing bracket for the function in question
var match = require('balanced-match');

export function activate(context: vscode.ExtensionContext) {

    // since our edit & undo both trigger the didChange event, and can occur consecutively
    // we count those to be sure we don't edit unless we really mean to
    // TODO - feature request for vscode for undo & keypress events!
    var changeCount = 2;

    // would be best if we a keyPress event, but this didChange is all vscode gives us
    vscode.workspace.onDidChangeTextDocument((event) => {

        // if this event isn't following an undo or an insert
        if(changeCount == 2){

            // if the user isn't making a block comment && their edit has left brackets unbalanced
            if((!isBlockComment()) && (!isBalanced())){

                // if the user's most recent edit was to comment an opening bracket
                if(currentLineHasCommentedBracket()){

                    // remember that we made an edit
                    changeCount = 0;

                    // find the closing bracket to comment
                    var bracket = findClosingBracket();

                    // comment it!
                    commentBracket(bracket);

                }

            }

        }

        else{

            // count that we did NOT make an edit after this didChange event
            changeCount++;
       }
         
    });

}

function commentBracket(lineCount){

    // get the current line's text
    var newPosition = new vscode.Position((lineCount), 0);
    var doc = vscode.window.activeTextEditor.document;
    var nextLine = doc.lineAt(newPosition).text;

    // create an edit obj to insert the comment chars
    let edit = new vscode.WorkspaceEdit();
    var rangeEnd = new vscode.Position((newPosition.line), nextLine.length);
    var newLine = nextLine.replace('}', '//}');

    // apply the edit!
    var docRange = new vscode.Range(newPosition, rangeEnd);
    edit.replace(doc.uri, docRange, newLine);
    vscode.workspace.applyEdit(edit);

}

function isBlockComment(){

     // if you haven't selected any lines, you must NOT be making a block comment 
     let editor = vscode.window.activeTextEditor;
     return !editor.selection.isEmpty;

}

function isBalanced(){

    // get the doc's text as a string
    var doc = vscode.window.activeTextEditor.document;
    var input = doc.getText();
         
    // placeholder for our closing bracket index
    var errorMessage;
    
    try {

        // ignore commented and quoted brackets
        var blockComments = balanced.matches({source: input, open: '/*', close: '*/'});
        var singleLineComments = balanced.getRangesForMatch(input, /^\s*\/\/.+$/gim);

        // check for unblanced
        balanced.matches({
            source: input,
            open: ['{'],
            close: ['}'],
            balance: true,
            exceptions: true,
            ignore: Array.prototype.concat.call([], blockComments, singleLineComments)
        });

    } catch (error) {
        errorMessage = error;
    }

    // if no "error" then the doc does not currently have unbalanced brackets
    return (errorMessage == null);

}


function currentLineHasCommentedBracket(){

    // flag
    var hasCommentedBracket = false;

    // get the text of the current line
    var doc = vscode.window.activeTextEditor.document;
    const position = vscode.window.activeTextEditor.selection.active;
    var currentLine = doc.lineAt(position).text;

    // check if the current line is commented
    var indexOfComment = currentLine.indexOf('//');
    if(indexOfComment > -1){

        // check if the line has a open-bracket after the comment
        var partOfLineAfterComment = currentLine.substring(indexOfComment);
        var hasCommentedBracket = false;
        hasCommentedBracket = (partOfLineAfterComment.indexOf('{') > -1);
    }

    return hasCommentedBracket;

}

function findClosingBracket(){


    // get the length of the document (starting from the current cursor position)
    var doc = vscode.window.activeTextEditor.document;
    let editor = vscode.window.activeTextEditor;
    const position = editor.selection.active;
    var lastChar = doc.lineAt(doc.lineCount-1).text.length;

    // get the text of the document (or the part of the doc after the cursor)
    var docRange = new vscode.Range(position, new vscode.Position(doc.lineCount-1, lastChar));
    var restOfDoc = doc.getText(docRange);

    // get the line containing the bracket we want to comment
    var lineToChange = match('{', '}', restOfDoc);

    // init placeholders for loop
    var totalChars = lineToChange.end;
    var lineCount = 0;
    var nextLineText = doc.lineAt(position).text;

    try{

        // count how many lines between the cursor and our bracket of interest,
        // by removing each line's length from our total number of remaining chars
        while((totalChars >= 0) && (lineCount <= doc.lineCount-1)){

            totalChars = totalChars-(nextLineText.length+1);
            lineCount++;
            nextLineText = doc.lineAt(new vscode.Position((position.line + lineCount), 0)).text;
        }
    }
    catch(error){
        // TODO - figure why sometimes this throws array out of bounds...
    }

    // this line must contain the bracket we want to comment!
    return (lineCount + position.line);

}

// this method is called when your extension is deactivated
export function deactivate() {
}





