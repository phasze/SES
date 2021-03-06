
$(document).ready(function(){

	$('#downloader').on('click',function(){
		DownloadSettings();
	})

	$('#restore-file').on("change",function(){
		RestoreSettings();
	});

	$('#AlwaysLoadHD').on("change",function(){
		//alert('changed');
		chrome.storage.sync.set({'AlwaysLoadHD': $('#AlwaysLoadHD').is(':checked')}, function() {
			  // Notify that we saved.
			  console.log("Successfully saved settings.");
		});
	});
	$('#showMetadata').on("change",function(){
		//alert('changed');
		chrome.storage.sync.set({'showMetadata': $('#showMetadata').is(':checked')}, function() {});
	});


	chrome.storage.sync.get("AlwaysLoadHD",function(result){
		$('#AlwaysLoadHD').prop('checked', result.AlwaysLoadHD);
	});
	chrome.storage.sync.get("showMetadata",function(result){
		$('#showMetadata').prop('checked', result.showMetadata);
	});
});

//Download the settings in the sync storage to a file
function DownloadSettings(){

	chrome.storage.sync.get(null,function(result){
		chrome.downloads.download({
			url:"data:text/plain,"+encodeURIComponent(JSON.stringify(result)),
			filename:"SCBackup.json"
		});

	});
}

// restore those settings
function RestoreSettings(){

	var reader = new FileReader();
	var file = document.querySelector('input[type=file]').files[0];
	var data;

	reader.addEventListener("load",function(){
		data = JSON.parse(reader.result);
		//console.log(data);
		chrome.storage.sync.set(data,function(){
			console.log("Restored");
		});

		//TODO: RESTORED

		$('#SUploadButton').html('<div class="sucUpload">SUCCESS<div>');

	}, false);

	if(file){
		//reader.readAsDataURL(file);
		reader.readAsText(file);
	}
}
