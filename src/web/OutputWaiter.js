import Utils from "../core/Utils.js";
import FileSaver from "file-saver";


/**
 * Waiter to handle events related to the output.
 *
 * @author n1474335 [n1474335@gmail.com]
 * @copyright Crown Copyright 2016
 * @license Apache-2.0
 *
 * @constructor
 * @param {App} app - The main view object for CyberChef.
 * @param {Manager} manager - The CyberChef event manager.
 */
const OutputWaiter = function(app, manager) {
    this.app = app;
    this.manager = manager;

    this.dishBuffer = null;
    this.dishStr = null;
};


/**
 * Gets the output string from the output textarea.
 *
 * @returns {string}
 */
OutputWaiter.prototype.get = function() {
    return document.getElementById("output-text").value;
};


/**
 * Sets the output in the output textarea.
 *
 * @param {string|ArrayBuffer} data - The output string/HTML/ArrayBuffer
 * @param {string} type - The data type of the output
 * @param {number} duration - The length of time (ms) it took to generate the output
 * @param {boolean} [preserveBuffer=false] - Whether to preserve the dishBuffer
 */
OutputWaiter.prototype.set = function(data, type, duration, preserveBuffer) {
    log.debug("Output type: " + type);
    const outputText = document.getElementById("output-text");
    const outputHtml = document.getElementById("output-html");
    const outputFile = document.getElementById("output-file");
    const outputHighlighter = document.getElementById("output-highlighter");
    const inputHighlighter = document.getElementById("input-highlighter");
    let scriptElements, lines, length;

    if (!preserveBuffer) {
        this.closeFile();
        document.getElementById("show-file-overlay").style.display = "none";
    }

    switch (type) {
        case "html":
            outputText.style.display = "none";
            outputHtml.style.display = "block";
            outputFile.style.display = "none";
            outputHighlighter.display = "none";
            inputHighlighter.display = "none";

            outputText.value = "";
            outputHtml.innerHTML = data;
            this.dishStr = Utils.unescapeHtml(Utils.stripHtmlTags(data, true));
            length = data.length;
            lines = this.dishStr.count("\n") + 1;

            // Execute script sections
            scriptElements = outputHtml.querySelectorAll("script");
            for (let i = 0; i < scriptElements.length; i++) {
                try {
                    eval(scriptElements[i].innerHTML); // eslint-disable-line no-eval
                } catch (err) {
                    log.error(err);
                }
            }
            break;
        case "ArrayBuffer":
            outputText.style.display = "block";
            outputHtml.style.display = "none";
            outputHighlighter.display = "none";
            inputHighlighter.display = "none";

            outputText.value = "";
            outputHtml.innerHTML = "";
            this.dishStr = "";
            length = data.byteLength;

            this.setFile(data);
            break;
        case "string":
        default:
            outputText.style.display = "block";
            outputHtml.style.display = "none";
            outputFile.style.display = "none";
            outputHighlighter.display = "block";
            inputHighlighter.display = "block";

            outputText.value = Utils.printable(data, true);
            outputHtml.innerHTML = "";

            lines = data.count("\n") + 1;
            length = data.length;
            this.dishStr = data;
            break;
    }

    this.manager.highlighter.removeHighlights();
    this.setOutputInfo(length, lines, duration);
};


/**
 * Shows file details.
 *
 * @param {ArrayBuffer} buf
 */
OutputWaiter.prototype.setFile = function(buf) {
    this.dishBuffer = buf;
    const file = new File([buf], "output.dat");

    // Display file overlay in output area with details
    const fileOverlay = document.getElementById("output-file"),
        fileSize = document.getElementById("output-file-size");

    fileOverlay.style.display = "block";
    fileSize.textContent = file.size.toLocaleString() + " bytes";
};


/**
 * Removes the output file and nulls its memory.
 */
OutputWaiter.prototype.closeFile = function() {
    this.dishBuffer = null;
    document.getElementById("output-file").style.display = "none";
};


/**
 * Handler for file download events.
 */
OutputWaiter.prototype.downloadFile = function() {
    this.filename = window.prompt("Please enter a filename:", this.filename || "download.dat");
    const file = new File([this.dishBuffer], this.filename);

    if (this.filename) FileSaver.saveAs(file, this.filename, false);
};


/**
 * Handler for file slice display events.
 */
OutputWaiter.prototype.displayFileSlice = function() {
    const startTime = new Date().getTime(),
        showFileOverlay = document.getElementById("show-file-overlay"),
        sliceFromEl = document.getElementById("output-file-slice-from"),
        sliceToEl = document.getElementById("output-file-slice-to"),
        sliceFrom = parseInt(sliceFromEl.value, 10),
        sliceTo = parseInt(sliceToEl.value, 10),
        str = Utils.arrayBufferToStr(this.dishBuffer.slice(sliceFrom, sliceTo));

    showFileOverlay.style.display = "block";
    this.set(str, "string", new Date().getTime() - startTime, true);
};


/**
 * Handler for show file overlay events.
 *
 * @param {Event} e
 */
OutputWaiter.prototype.showFileOverlayClick = function(e) {
    const outputFile = document.getElementById("output-file"),
        showFileOverlay = e.target;

    outputFile.style.display = "block";
    showFileOverlay.style.display = "none";
    this.setOutputInfo(this.dishBuffer.byteLength, null, 0);
};


/**
 * Displays information about the output.
 *
 * @param {number} length - The length of the current output string
 * @param {number} lines - The number of the lines in the current output string
 * @param {number} duration - The length of time (ms) it took to generate the output
 */
OutputWaiter.prototype.setOutputInfo = function(length, lines, duration) {
    let width = length.toString().length;
    width = width < 4 ? 4 : width;

    const lengthStr = length.toString().padStart(width, " ").replace(/ /g, "&nbsp;");
    const timeStr = (duration.toString() + "ms").padStart(width, " ").replace(/ /g, "&nbsp;");

    let msg = "time: " + timeStr + "<br>length: " + lengthStr;

    if (typeof lines === "number") {
        const linesStr = lines.toString().padStart(width, " ").replace(/ /g, "&nbsp;");
        msg += "<br>lines: " + linesStr;
    }

    document.getElementById("output-info").innerHTML = msg;
    document.getElementById("input-selection-info").innerHTML = "";
    document.getElementById("output-selection-info").innerHTML = "";
};


/**
 * Adjusts the display properties of the output buttons so that they fit within the current width
 * without wrapping or overflowing.
 */
OutputWaiter.prototype.adjustWidth = function() {
    const output         = document.getElementById("output");
    const saveToFile     = document.getElementById("save-to-file");
    const copyOutput     = document.getElementById("copy-output");
    const switchIO       = document.getElementById("switch");
    const undoSwitch     = document.getElementById("undo-switch");
    const maximiseOutput = document.getElementById("maximise-output");

    if (output.clientWidth < 680) {
        saveToFile.childNodes[1].nodeValue = "";
        copyOutput.childNodes[1].nodeValue = "";
        switchIO.childNodes[1].nodeValue = "";
        undoSwitch.childNodes[1].nodeValue = "";
        maximiseOutput.childNodes[1].nodeValue = "";
    } else {
        saveToFile.childNodes[1].nodeValue = " Save to file";
        copyOutput.childNodes[1].nodeValue = " Copy output";
        switchIO.childNodes[1].nodeValue = " Move output to input";
        undoSwitch.childNodes[1].nodeValue = " Undo";
        maximiseOutput.childNodes[1].nodeValue =
            maximiseOutput.getAttribute("title") === "Maximise" ? " Max" : " Restore";
    }
};


/**
 * Handler for save click events.
 * Saves the current output to a file.
 */
OutputWaiter.prototype.saveClick = function() {
    if (!this.dishBuffer) {
        this.dishBuffer = new Uint8Array(Utils.strToCharcode(this.dishStr)).buffer;
    }
    this.downloadFile();
};


/**
 * Handler for copy click events.
 * Copies the output to the clipboard.
 */
OutputWaiter.prototype.copyClick = function() {
    // Create invisible textarea to populate with the raw dishStr (not the printable version that
    // contains dots instead of the actual bytes)
    const textarea = document.createElement("textarea");
    textarea.style.position = "fixed";
    textarea.style.top = 0;
    textarea.style.left = 0;
    textarea.style.width = 0;
    textarea.style.height = 0;
    textarea.style.border = "none";

    textarea.value = this.dishStr;
    document.body.appendChild(textarea);

    // Select and copy the contents of this textarea
    let success = false;
    try {
        textarea.select();
        success = this.dishStr && document.execCommand("copy");
    } catch (err) {
        success = false;
    }

    if (success) {
        this.app.alert("Copied raw output successfully.", "success", 2000);
    } else {
        this.app.alert("Sorry, the output could not be copied.", "danger", 2000);
    }

    // Clean up
    document.body.removeChild(textarea);
};


/**
 * Handler for switch click events.
 * Moves the current output into the input textarea.
 */
OutputWaiter.prototype.switchClick = function() {
    this.switchOrigData = this.manager.input.get();
    document.getElementById("undo-switch").disabled = false;
    if (this.dishBuffer) {
        this.manager.input.setFile(new File([this.dishBuffer], "output.dat"));
        this.manager.input.handleLoaderMessage({
            data: {
                progress: 100,
                fileBuffer: this.dishBuffer
            }
        });
    } else {
        this.app.setInput(this.dishStr);
    }
};


/**
 * Handler for undo switch click events.
 * Removes the output from the input and replaces the input that was removed.
 */
OutputWaiter.prototype.undoSwitchClick = function() {
    this.app.setInput(this.switchOrigData);
    document.getElementById("undo-switch").disabled = true;
};

/**
 * Handler for file switch click events.
 * Moves a file's data for items created via Utils.displayFilesAsHTML to the input.
 */
OutputWaiter.prototype.fileSwitch = function(e) {
    e.preventDefault();
    this.switchOrigData = this.manager.input.get();
    this.app.setInput(e.target.getAttribute("fileValue"));
    document.getElementById("undo-switch").disabled = false;
};


/**
 * Handler for maximise output click events.
 * Resizes the output frame to be as large as possible, or restores it to its original size.
 */
OutputWaiter.prototype.maximiseOutputClick = function(e) {
    const el = e.target.id === "maximise-output" ? e.target : e.target.parentNode;

    if (el.getAttribute("title") === "Maximise") {
        this.app.columnSplitter.collapse(0);
        this.app.columnSplitter.collapse(1);
        this.app.ioSplitter.collapse(0);

        el.setAttribute("title", "Restore");
        el.innerHTML = "<img src='data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAYAAAAf8/9hAAAABmJLR0QA/wD/AP+gvaeTAAAACXBIWXMAAAsTAAALEwEAmpwYAAAAlUlEQVQ4y93RwQpBQRQG4C9ba1fxBteGPIj38BTejFJKLFnwCJIiCsW1mcV0k9yx82/OzGK+OXMGOpiiLTFjFNiilQI0sQ7IJiAjLKsgGVYB2YdaVO0kwy46/BVQi9ZDNPyQWen2ub/KufS8y7shfkq9tF9U7SC+/YluKvAI9YZeFeCECXJcA3JHP2WgMXJM/ZUcBwxeM+YuSWTgMtUAAAAASUVORK5CYII='> Restore";
        this.adjustWidth();
    } else {
        el.setAttribute("title", "Maximise");
        el.innerHTML = "<img src='data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAYAAAAf8/9hAAAABmJLR0QA/wD/AP+gvaeTAAAACXBIWXMAAAsTAAALEwEAmpwYAAAAi0lEQVQ4y83TMQrCQBCF4S+5g4rJEdJ7KE+RQ1lrIQQCllroEULuoM0Ww3a7aXwwLAzMPzDvLcz4hnooUItT1rsoVNy+4lgLWNL7RlcCmDBij2eCfNCrUITc0dRCrhj8m5otw0O6SV8LuAV3uhrAAa8sJ2Np7KPFawhgscVLjH9bCDhjt8WNKft88w/HjCvuVqu53QAAAABJRU5ErkJggg=='> Max";
        this.app.resetLayout();
    }
};


/**
 * Shows or hides the loading icon.
 *
 * @param {boolean} value
 */
OutputWaiter.prototype.toggleLoader = function(value) {
    const outputLoader = document.getElementById("output-loader"),
        outputElement = document.getElementById("output-text");

    if (value) {
        this.manager.controls.hideStaleIndicator();
        this.bakingStatusTimeout = setTimeout(function() {
            outputElement.disabled = true;
            outputLoader.style.visibility = "visible";
            outputLoader.style.opacity = 1;
            this.manager.controls.toggleBakeButtonFunction(true);
        }.bind(this), 200);
    } else {
        clearTimeout(this.bakingStatusTimeout);
        outputElement.disabled = false;
        outputLoader.style.opacity = 0;
        outputLoader.style.visibility = "hidden";
        this.manager.controls.toggleBakeButtonFunction(false);
        this.setStatusMsg("");
    }
};


/**
 * Sets the baking status message value.
 *
 * @param {string} msg
 */
OutputWaiter.prototype.setStatusMsg = function(msg) {
    const el = document.querySelector("#output-loader .loading-msg");

    el.textContent = msg;
};


/**
 * Returns true if the output contains carriage returns
 *
 * @returns {boolean}
 */
OutputWaiter.prototype.containsCR = function() {
    return this.dishStr.indexOf("\r") >= 0;
};

export default OutputWaiter;
