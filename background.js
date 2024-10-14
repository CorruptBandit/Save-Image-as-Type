let messages;

function download(url, filename) {
  chrome.downloads.download(
    { url, filename, saveAs: true },
    function (downloadId) {
      if (!downloadId) {
        let msg = "An error occurred while saving the image";
        if (chrome.runtime.lastError) {
          msg += ": \n" + chrome.runtime.lastError.message;
        }
        notify(msg);
      }
    }
  );
}

async function fetchAsDataURL(src, callback) {
  if (src.startsWith("data:")) {
    callback(null, src);
    return;
  }
  fetch(src)
    .then((res) => res.blob())
    .then((blob) => {
      if (!blob.size) {
        throw "Fetch failed of 0 size";
      }
      let reader = new FileReader();
      reader.onload = async function (evt) {
        let dataurl = evt.target.result;
        callback(null, dataurl);
      };
      reader.readAsDataURL(blob);
    })
    .catch((error) => callback(error.message || error));
}

function getSuggestedFilename(src, type) {
  if (src.match(/googleusercontent\.com\/[0-9a-zA-Z]{30,}/)) {
    return "screenshot." + type;
  }
  if (src.startsWith("blob:") || src.startsWith("data:")) {
    return "Untitled." + type;
  }
  let filename = src
    .replace(/[?#].*/, "")
    .replace(/.*[\/]/, "")
    .replace(/\+/g, " ");
  filename = decodeURIComponent(filename);
  filename = filename.replace(/[\x00-\x7f]+/g, function (s) {
    return s.replace(/[^\w\-\.\,@ ]+/g, "");
  });
  while (filename.match(/\.[^0-9a-z]*\./)) {
    filename = filename.replace(/\.[^0-9a-z]*\./g, ".");
  }
  filename = filename.replace(/\s\s+/g, " ").trim();
  filename = filename.replace(/\.(jpe?g|png|gif|webp|svg)$/gi, "").trim();
  if (filename.length > 32) {
    filename = filename.substr(0, 32);
  }
  filename = filename.replace(/[^0-9a-z]+$/i, "").trim();
  if (!filename) {
    filename = "image";
  }
  return filename + "." + type;
}

function notify(msg) {
  if (msg.error) {
    msg = msg.error + "\n" + (msg.srcUrl || msg.src);
  }
  console.log(msg);
}

function loadMessages() {
  if (!messages) {
    messages = {};
    messages["errorOnSaving"] = "An error occurred while saving the image";
    messages["errorOnLoading"] = "An error occurred while loading the image";
  }
  return messages;
}

function connectTab(tab, frameId) {
  let port = chrome.tabs.connect(tab.id, {
    name: "convertType",
    frameId: frameId,
  });
  return port;
}

function extractAndDecodeImageUrl(linkUrl) {
  try {
    // Extract the imgurl parameter using a regular expression
    let imgurlMatch = linkUrl.match(/[?&]imgurl=([^&]+)/);

    if (imgurlMatch && imgurlMatch[1]) {
      // Decode the extracted imgurl (percent-decoded)
      let decodedImageUrl = decodeURIComponent(imgurlMatch[1]);
      return decodedImageUrl;
    }
    return null; // Return null if imgurl is not found
  } catch (error) {
    console.error("Error extracting and decoding image URL: ", error);
    return null;
  }
}

// On extension installation
chrome.runtime.onInstalled.addListener(function () {
  loadMessages();
  ["JPG", "PNG"].forEach(function (type) {
    chrome.contextMenus.create({
      id: "save_as_" + type.toLowerCase(),
      title: "Save as " + type,
      type: "normal",
      contexts: ["image"],
    });
  });
  chrome.contextMenus.create({
    id: "sep_1",
    type: "separator",
    contexts: ["image"],
  });
});

// Handle messages from other parts of the extension
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  let { target, op } = message || {};
  if (target == "background" && op) {
    if (op == "download") {
      let { url, filename } = message;
      download(url, filename);
    } else if (op == "notify") {
      let msg = message.message;
      if (msg && msg.error) {
        let msg2 = chrome.i18n.getMessage(msg.error) || msg.error;
        if (msg.src) {
          msg2 += "\n" + msg.src;
        }
        notify(msg2);
      } else {
        notify(message);
      }
    } else {
      console.warn("unknown op: " + op);
    }
  }
});

// Context menu click event handler
chrome.contextMenus.onClicked.addListener(async (info, tab) => {
  let { menuItemId, mediaType, srcUrl, frameId, linkUrl } = info;

  // Check if the URL is valid and contains an image URL
  if (menuItemId.startsWith("save_as_") && mediaType === "image") {
    loadMessages();

    let imageUrl = srcUrl;
    let type = menuItemId.replace("save_as_", "");
    let filename = getSuggestedFilename(imageUrl, type);

    // Establish connection with the content script
    let sendMessageToContentScript = async (src, op) => {
      let port = connectTab(tab, frameId);
      await port.postMessage({
        op: op,
        target: "content",
        src: src,
        type,
        filename,
      });
    };

    let imageOrigin;
    let currentTabOrigin;
    let originsToRequest;

    if (imageUrl.includes("data:image")) {
      /*
      This is usually if the user has tried to access an image indirectly
      For example: On google images right clicking an image without directly clicking on it first
      This will cause a raw `data:image` block, however we cannot request this as we need permissions
      To fix this we extract the real Url from the linkUrl, that way we only need permissions for 
      the site of the image, not for Google, Bing, etc.
      */
      imageUrl = extractAndDecodeImageUrl(linkUrl);
    }

    // Extract the origin from the imageUrl
    imageOrigin = new URL(imageUrl).origin;
    currentTabOrigin = new URL(tab.url).origin;

    // Create an array of origins to request permissions
    originsToRequest = [...new Set([imageOrigin, currentTabOrigin])];

    console.log(imageUrl);

    // Dynamically request permission to access both origins
    chrome.permissions.request(
      {
        origins: originsToRequest.map((origin) => `${origin}/*`), // Request permission for both origins
      },
      async (granted) => {
        if (granted) {
          // Proceed with saving the image if permission is granted
          await chrome.scripting.executeScript({
            target: {
              tabId: tab.id,
              frameIds: frameId ? [frameId] : undefined,
            },
            files: ["converter.js"],
          });

          // Fetch the image as a data URL
          fetchAsDataURL(imageUrl, async function (error, dataurl) {
            if (error) {
              notify({ error, imageUrl });
              return;
            }

            // If the image type matches, directly download it; otherwise, convert it
            let noChange = dataurl.startsWith(
              "data:image/" + (type === "jpg" ? "jpeg" : type) + ";"
            );
            await sendMessageToContentScript(
              dataurl,
              noChange ? "download" : "convertType"
            );
          });
        } else {
          notify("Permission was denied to access the required origins");
        }
      }
    );
  }
});
