let messages;

function download(url, filename) {
	chrome.downloads.download(
		{ url, filename, saveAs: true },
		function(downloadId) {
			if (!downloadId) {
				let msg = "An error occurred while saving the image";
				if (chrome.runtime.lastError) {
					msg += ': \n'+ chrome.runtime.lastError.message;
				}
				notify(msg);
			}
		}
	);
}

async function fetchAsDataURL(src, callback) {
	if (src.startsWith('data:')) {
		callback(null, src);
		return;
	}
	fetch(src)
	.then(res => res.blob())
	.then(blob => {
		if (!blob.size) {
			throw 'Fetch failed of 0 size';
		}
		let reader = new FileReader();
		reader.onload = async function(evt){
			let dataurl = evt.target.result;
			callback(null, dataurl);
		};
		reader.readAsDataURL(blob);
	})
	.catch(error => callback(error.message || error));
}

function getSuggestedFilename(src, type) {
	//special for chrome web store apps
	if(src.match(/googleusercontent\.com\/[0-9a-zA-Z]{30,}/)){
		return 'screenshot.'+type;
	}
	if (src.startsWith('blob:') || src.startsWith('data:')) {
		return 'Untitled.'+type;
	}
	let filename = src.replace(/[?#].*/,'').replace(/.*[\/]/,'').replace(/\+/g,' ');
	filename = decodeURIComponent(filename);
	filename = filename.replace(/[\x00-\x7f]+/g, function (s){
		return s.replace(/[^\w\-\.\,@ ]+/g,'');
	});
	while(filename.match(/\.[^0-9a-z]*\./)){
		filename = filename.replace(/\.[^0-9a-z]*\./g,'.');
	}
	filename = filename.replace(/\s\s+/g,' ').trim();
	filename = filename.replace(/\.(jpe?g|png|gif|webp|svg)$/gi,'').trim();
	if(filename.length > 32){
		filename = filename.substr(0,32);
	}
	filename = filename.replace(/[^0-9a-z]+$/i,'').trim();
	if(!filename){
		filename = 'image';
	}
	return filename+'.'+type;
}

function notify(msg) {
	if (msg.error) {
		msg = msg.error + '\n'+ (msg.srcUrl || msg.src);
	}
}

function loadMessages() {
	if (!messages) {
		messages = {};
		messages['errorOnSaving'] = "An error occurred while saving the image"
		messages['errorOnLoading'] = "An error occurred while loading the image"
	}
	return messages;
}

chrome.runtime.onInstalled.addListener(function () {
	loadMessages();
	['JPG','PNG'].forEach(function (type){
		chrome.contextMenus.create({
			"id" : "save_as_" + type.toLowerCase(),
			"title" : "Save as " + type,
			"type" : "normal",
			"contexts" : ["image"],
		});
	});
	chrome.contextMenus.create({
		"id" : "sep_1",
		"type" : "separator",
		"contexts" : ["image"]
	});
});

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
	let {target, op} = message || {};
	if (target == 'background' && op) {
		if (op == 'download') {
			let {url, filename} = message;
			download(url, filename);
		} else if (op == 'notify') {
			let msg = message.message;
			if (msg && msg.error) {
				let msg2 = chrome.i18n.getMessage(msg.error) || msg.error;
				if (msg.src) {
					msg2 += '\n'+ msg.src;
				}
				notify(msg2);
			} else {
				notify(message);
			}
		} else {
			console.warn('unknown op: ' + op);
		}
	}
});

chrome.contextMenus.onClicked.addListener(async (info, tab) => {
	let {menuItemId, mediaType, srcUrl} = info;
	let connectTab = () => {
		let port = chrome.tabs.connect(
			tab.id,
			{
				name: 'convertType',
				frameId: info.frameId,
			},
		);
		return port;
	};
	if (menuItemId.startsWith('save_as_')) {
		if (mediaType=='image' && srcUrl) {
			loadMessages();;

			let frameIds = info.frameId ? [] : void 0;
			await chrome.scripting.executeScript({
				target: { tabId: tab.id, frameIds },
				files: ["converter.js"], // content script and offscreen use the same file.
			});
			}
			fetchAsDataURL(srcUrl, async function(error, dataurl) {
				if (error) {
					notify({error, srcUrl});
					return;
				}
				let type = menuItemId.replace('save_as_', '');
				let filename = getSuggestedFilename(srcUrl, type);
				let noChange = srcUrl.startsWith('data:image/' + (type == 'jpg' ? 'jpeg' : type) + ';');
				let port = connectTab();
				await port.postMessage({ op: noChange ? 'download' : 'convertType', target: 'content', src: dataurl, type, filename });
				return;
			});
			return;
		} else {
			notify("It's not an image");

};
})
