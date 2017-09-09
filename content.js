//alert("Hello from your Chrome extension!")
//api call http://superchillin.com/api/phase/get_series.php?epid=37198
var StoredSCInfo = {};
var StoredFavShows = [];
var StoredLatestFavShows = {}; //contains [showID]{seen(bool),link}
var StoredFavMovies = [];
var APIUrl = "https://app.imdb.com/title/maindetails?tconst=";
var AlwaysLoadHD = true;
var ShowProgress = {};
var ImprovedShowProgress = {}; //contains {id:{percent,userTimeElapsed}}
var intervalID;
var EPISODE_SEEN_PERCENTAGE = 80;

//replace the tv series link at the top with a better one...(default to organized by latest)
$('a[href="series.php"][style="color:#ffffff"]').attr('href','series.php?bl=1');

//TODO when a new episode is available mark as NEW
//	on visit of series.php fill out fave latest storedShows (if empty)
//		store as StoredLatestFavShows["id"] = {link:"link?",seen:false}
//	on visit of url save StoredLatestFavShows["id"] = "link" (search array)

//Updates the data storage for storedShows
function updateShows(){
	chrome.storage.sync.get('storedShows',function(result){
		chrome.storage.sync.get('StoredLatestFavShows', function(otherResult){
			console.log(result);
			StoredFavShows = result.storedShows;
			StoredLatestFavShows = otherResult.StoredLatestFavShows;
			if(StoredLatestFavShows==null){
				StoredLatestFavShows = {};
			}
			if(StoredFavShows==null)
				StoredFavShows = [];
			UpdateRows();
		});
	});
}

function updateMovies(){
	chrome.storage.sync.get('storedMovies',function(result){
		console.log(result);
		StoredFavMovies = result.storedMovies;
		if(StoredFavMovies==null)
			StoredFavMovies = [];
		UpdateMovRows();
	});
}

function saveFavShows(){
		chrome.storage.sync.set({'storedShows': StoredFavShows}, function() {
			  // Notify that we saved.
			  console.log("saved favorite shows");
			});
}

function saveFavMovies(){
		chrome.storage.sync.set({'storedMovies': StoredFavMovies}, function() {
			  // Notify that we saved.
			  console.log("saved movie for later");
			});
}

function saveStoredLatestFavShows(){
		chrome.storage.sync.set({'StoredLatestFavShows': StoredLatestFavShows}, function() {
			  // Notify that we saved.
			  console.log("saved seen shows");
			});
}

function saveImprovedShowProgress(displayMessage){
	//chrome.storage.sync.set({'ImprovedShowProgress': ImprovedShowProgress}, function() {
	SetKey('ChunkedShowProgress2',ImprovedShowProgress,function(){
		  // Notify that we saved.
			if(displayMessage){
				displayAlertMessage('Updated episodes', true, 2000);
			}
		  console.log("Successfully saved ImprovedShowProgress.");
	});
}

function getCurrentEpisodeID(){
	var locHref = location.href;
	var EpisodeID = locHref.substring(locHref.indexOf('?')+1,locHref.indexOf('&'));
	//because I'm silly and saved like this...
	if(EpisodeID.indexOf('/')==-1){
		EpisodeID = '/?'+EpisodeID+'&tv=1';
	}
	return EpisodeID;
}
function getCurrentShowID(){
		var showid = $('a[href*="episodes.php?"]').attr('href');
		return showid.substring(showid.indexOf('?')+1);
}

chrome.storage.onChanged.addListener(function(changes, namespace) {
	for (key in changes) {
	  var storageChange = changes[key];
	  /*console.log('Storage key "%s" in namespace "%s" changed. ' +
				  'Old value was "%s", new value is "%s".',
				  key,
				  namespace,
				  storageChange.oldValue,
				  storageChange.newValue);*/
	}
});

//add to favorites section
var favoriter = function favoriteMe(){
	//alert('favorited');
	console.log(this);
	var parent = $(this).parent().parent();
	var idToStore = parent.find('a[href*="episodes"]').attr('href').substring(14);

	//TODO: remove favorite if clicking in favorites
	if($(this).parents('.scFavorites').length!=0){
		var index = StoredFavShows.indexOf(idToStore);
		if (index > -1) {
			StoredFavShows.splice(index, 1);
		}
		saveFavShows();
		var theItem = $(parent).detach();
		theItem = $('<table></table>').append(theItem);
		$(theItem).insertBefore('td[style*="color:#fff"] > table:first').after('<hr>');
	}
	else{
		$($(this).parents('table')[0]).next('hr').remove();
		var addedToFavorited = $($(this).parents('table')[0]).detach(); //remove from original list

		// store in extension storage

		if(StoredFavShows.length==1 || $.inArray(idToStore,StoredFavShows)==-1)
		{
			StoredFavShows.push(idToStore);
		}
		else console.log('already saved '+idToStore);

		//StoredSCInfo['storedShows']
		saveFavShows();

		$('.scFavorites td:first').append(addedToFavorited);
		//addedToFavorited.after('<hr>');
		//$(this).parent('table')
	}


}

//If we're on the series page let's show their tracked shows
if(location.href.indexOf("series.php")!=-1){
	//using this stupid selector because of the horrible way this page is written...
	$('tr:nth-child(2) > td:nth-child(3) > table > tbody > tr:nth-child(1)').after('<tr class="scFavorites"><td class="replicatedStyle"><p>Favorites</p><hr><br/></td></tr>');

	updateShows(); //async get inside

}

//the onclick function to add a movie to favorites
var movFavoriter = function(){
	var movieID = $(this).prev().attr('href').substring(2);


	if($(this).parents('#savedMovies').length!=0){
		//if already in favorites then remove it
		var index = StoredFavMovies.indexOf(movieID);
		if (index > -1) {
			StoredFavMovies.splice(index, 1);
		}
		saveFavMovies();

		//update favorites
		$(this).parent().remove();
	}
	else{ //otherwise add it
		StoredFavMovies.push(movieID);
		saveFavMovies();
		addToMovieFavorites(this, movieID);


	}

	console.log(movieID);
}

//displays an alert in the top middle or bottom right
function displayAlertMessage(message, smallRight, timeInMillisenconds){
	var alertClass = 'alert';
	if(smallRight){
		alertClass = 'bottomRightAlert';
	}
	var donateThing =
	$('<form target="_blank" action="https://www.paypal.com/cgi-bin/webscr" method="post" target="_top">'+
		'<input type="hidden" name="cmd" value="_s-xclick">'+
		'<input type="hidden" name="hosted_button_id" value="FEC3VV3A7ETMG">'+
		'<input type="image" src="https://www.paypalobjects.com/en_US/i/btn/btn_donate_SM.gif" border="0" name="submit" alt="PayPal - The safer, easier way to pay online!">'+
		'<img alt="" border="0" src="https://www.paypalobjects.com/en_US/i/scr/pixel.gif" width="1" height="1">'+
	'</form>');
	var alertDiv = $('<div class="'+alertClass+'" onclick="this.style.display=\'none\';" id="notifyAlert">'+message+'</div>');
	$(alertDiv).append(donateThing);
	$('body').prepend(alertDiv);

	setTimeout(function(){
		$(alertDiv).fadeOut("slow");
	},timeInMillisenconds);
	setTimeout(function(){
		$(alertDiv).remove();
	},timeInMillisenconds+2000);

}

// Adds the favorited movies to the saved for later section
function addToMovieFavorites(originator, lehMovId){
	var toBeAddedToFavorites = $('<span class="movFav"></span>');

	//clone the link and star
	var cloned = $(originator).prev().clone();
	cloned.addClass('tippable_enhanced');
	toBeAddedToFavorites.append(cloned);
	toBeAddedToFavorites.append(' - ');
	toBeAddedToFavorites.append($(originator).detach());

	$('#savedMovies').append(toBeAddedToFavorites);
	toBeAddedToFavorites.append('<br/>');
}

//Movies page
if( location.href.indexOf("latest.php")!=-1){

	$('body > table:nth-child(4) > tbody > tr:nth-child(2) > td:nth-child(3) > table > tbody > tr:nth-child(2) > td > span')
		.before('<div id="savedMovies"> <h2 style="text-decoration:underline" >Saved for later</h2></div><br/>');

	updateMovies();
}
if( location.href.indexOf("year.php")!=-1 ||
	location.href.indexOf("rating.php")!=-1 ){
	$('body > table:nth-child(4) > tbody > tr:nth-child(2) > td:nth-child(3) > table > tbody > tr:nth-child(2) > td > br:first')
		.before('<div id="savedMovies"> <h2 style="text-decoration:underline" >Saved for later</h2></div><br/>');

	updateMovies();
}
var re = /http(s|):\/\/superchillin\.(com|net)\/\?\d*(&s=\d*|&tv=1|)*$/
if(re.exec(location.href) && $('a[href*="hd=1"]')) //On a non-HD page of a movie/show
{

	chrome.storage.sync.get('AlwaysLoadHD',function(result){

		//console.log(result);
		if((result.AlwaysLoadHD===undefined || result.AlwaysLoadHD==true) && $('a[href*="hd=1"]').length>0) {
			chrome.storage.sync.set({'displayAlert': true, function() {}}); //displays alert on next page load that we did it
			location = $('a[href*="hd=1"]').attr('href');
		}
		else{
			movInfoDisplay();
		}
	});
}
re = /http(s|):\/\/superchillin\.(com|net)\/\?\d*(&s=\d*|&tv=1)*(&hd=1)/
if(re.exec(location.href)) //on the HD page of a movie/show
{
	chrome.storage.sync.get('displayAlert',function(result){
		movInfoDisplay();
		if(result.displayAlert==true){
			displayAlertMessage(" Switched to HD ", false, 4000);
			//$('body').prepend('<div class="alert" onclick="this.style.display=\'none\';" id="notifyAlert"> Switched to HD </div>');
			//alert('display alert');

			//setTimeout(function(){
			//	$("#notifyAlert").fadeOut("slow");
			//},5000);

			chrome.storage.sync.set({'displayAlert': false, function() {}});
		}
	});
}


//Adds TV shows to favorited section and removes them from normal position
function UpdateRows(){
	//add the star to each item
	$('td[style*="color:#fff"] > table tr').each(function(){
		var td = $(this).find('td').css("width","5%");
		td = td.next().css("width","90%");
		td.next().css("width","5%");

		//put proper ID here
		var clicker = $('<span class="rightStar">☆</span>');
		clicker.on('click',favoriter);
		var toBeAdded = $('<td></td>').append(clicker);
		$(this).append(toBeAdded);

		// add to favorite list instead of displaying below
		var href = $(this).find('a[href*="episodes"]').attr('href');
		var idOfMe = href.substring(href.indexOf('?')+1);


		if(StoredFavShows != null && StoredFavShows.length>0 && $.inArray(idOfMe,StoredFavShows)!=-1){
			$(this).parent().parent().next('hr').remove(); //remove the line
			var toBeFav = $(this).detach(); //detach from DOM
			$(toBeFav).addClass('favedShow_'+idOfMe); //give it a class
			$('.scFavorites td:first').append(toBeFav); //add to favorites section
			//addNewImageToFavedShow(idOfMe);

			var hrefOfLatestEpisode = $(this).find('a[href*="tv=1"]').attr('href');
			if(StoredLatestFavShows[idOfMe]==null){
				StoredLatestFavShows[idOfMe]={link:hrefOfLatestEpisode,seen:true};
				saveStoredLatestFavShows();
			}
			else if(StoredLatestFavShows[idOfMe].link!=hrefOfLatestEpisode){
				StoredLatestFavShows[idOfMe].link = hrefOfLatestEpisode;
				StoredLatestFavShows[idOfMe].seen = false;
				saveStoredLatestFavShows();
				addNewImageToFavedShow(idOfMe);
			}else if(StoredLatestFavShows[idOfMe].seen==false){
				addNewImageToFavedShow(idOfMe);
			}
			//alert('added');
		}
	});

}

//Adds stars to movie rows but not to ones already saved for later
function UpdateMovRows(){

	//add stars
	$('.tippable').each(function(){

		var movId = $(this).attr('href').substring(2);

		var star = $('<span class="rightStarMov">☆</span>'); //add star
		star.on('click',movFavoriter);
		$(this).after(star).after(' - ');

		if($.inArray(movId,StoredFavMovies)!=-1){ //if inside
			addToMovieFavorites(star, movId);
		}
	});

	//temporary section to load the movie pictures.
	$(".tippable_enhanced").mousemove(function(e) {

		$('.balloon').html('<a href="/?' + $(this).attr('id') + '"><img src="https://img.superchillin.org/2img/' + $(this).attr('id') + '.jpg" width="214" height"317" alt=""/></a>');
		$('.balloon').css('left', e.pageX + 25).css('top', e.pageY + 25).css('display', 'block');

	});
	$(".tippable_enhanced").mouseout(function() {
            $('.balloon').css('display', 'none');
        });
}

//Save an episode as 'seen'
function userSaveShowProgress(showID, hrefOfEpisode, checke){
	//we're getting rid of this object
	if(ShowProgress && ShowProgress[showID]){
		delete ShowProgress[showID];
	}

	if(ImprovedShowProgress===undefined){
      ImprovedShowProgress={};
  }
	if(ImprovedShowProgress[showID]===undefined){
		ImprovedShowProgress[showID] = {};
	}


	//var hrefOfShow = $('#checlbox_'+episodeID).next('a').attr('href');

	if(checke){
		ImprovedShowProgress[showID][hrefOfEpisode]={percent:100};
		//ShowProgress[showID].push(episodeID);
	}
	else{
		//tricky way of removing the checked item (unchecking)
		//if(ShowProgress[showID].indexOf(episodeID)!=-1)
		//	ShowProgress[showID].splice(ShowProgress[showID].indexOf(episodeID),1);

		if(ImprovedShowProgress[showID][hrefOfEpisode])
			delete ImprovedShowProgress[showID][hrefOfEpisode];
	}

	chrome.storage.sync.set({'showProgress': ShowProgress}, function() {
		  // Notify that we saved.
		  console.log("Successfully saved ShowProgress.");
	});
	saveImprovedShowProgress(true);
}

// if we're on the episodes page let's mark off the one's we've already watched
var reEpisodes = /http(s|):\/\/superchillin\.(com|net)\/episodes\.php\?\d*$/
if(reEpisodes.exec(location.href)){
	var showID = location.href.split('?')[1];


	//Convert old showid format (won't show for users until page refresh)
	chrome.storage.sync.get('showProgress',function(result){
		ShowProgress = result.showProgress;

		if(ShowProgress && ShowProgress[showID])
		{
			var imdex = 0;
			var first = true;
			$('b').each(function(){
				if(first){first=false;} //title is bolded, I hate having to use these selectors....
				else{
					var tempIndex = imdex;
					imdex++;
					var href = $(this).find('a').attr('href');
					//var toBeAdded = $('<input id="checlbox_'+tempIndex+'" type="checkbox">');

					//cleanup of this object (ShowProgress) will happen when the user attempts to save
					if(ShowProgress!==undefined && ShowProgress[showID]!==undefined ){
						//add to improved
						if($.inArray(tempIndex,ShowProgress[showID])!=-1){
							SaveEpisodeProgress(showID,href,100);
						}
					}
				}
			});
			delete ShowProgress[showID];
			chrome.storage.sync.set({'showProgress': ShowProgress}, function() {
				  // Notify that we saved.
				  console.log("Successfully saved ShowProgress.");
					displayAlertMessage("Saved in new format, you may need to refresh page to see old saved episodes.", false, 5000);
			});
		}

		GetKey('ChunkedShowProgress2',function(result){
			if(result.ChunkedShowProgress2){
				ImprovedShowProgress = result.ChunkedShowProgress2;
				AddCheckBoxesToShows();
			}
			else{
				chrome.storage.sync.get('ImprovedShowProgress',function(result){
					ImprovedShowProgress = result.ImprovedShowProgress;
					//console.log(JSON.stringify(ImprovedShowProgress));
					saveImprovedShowProgress();
					AddCheckBoxesToShows();
					//continue on
				});
			}

		});

	});
}

function AddCheckBoxesToShows(){
		//Add the checkboxes and bind the change events
		if(ImprovedShowProgress === undefined){
			ImprovedShowProgress = {};
		}

		var first = true;
		$('b').each(function(){
			if(first){first=false;} //title is bolded, I hate having to use these selectors....
			else{
				var href = $(this).find('a').attr('href');
				//var toBeAdded = $('<label class="coolCheck"><input id="checlbox_'+href+'" type="checkbox"><div class="box"></div></label>');
				/*
					<span class="cntr">
					  <input id="cbx" type="checkbox"/>
					  <label class="cbx" for="cbx"/>
					  <label class="lbl" for="cbx"/>
					</span>
				*/
				var idOfCheckbox = 'checlbox_'+href;
				var toBeAdded = $('<span class="cntr"></span>');
				var labelThing = $('<label class="cbx" for="'+idOfCheckbox+'"></label><text> </text>');
				var inputThing = $('<input id="'+idOfCheckbox+'" class="cbxInput" type="checkbox">');
				$(inputThing).on('change',function(){
					userSaveShowProgress(showID,href,this.checked);
				});
				toBeAdded.append(inputThing);
				toBeAdded.append(labelThing);
				//var toBeAdded = $('<input id="checlbox_'+href+'" type="checkbox">');
				if(ImprovedShowProgress[showID] && ImprovedShowProgress[showID][href]){
					if(ImprovedShowProgress[showID][href].percent>EPISODE_SEEN_PERCENTAGE){
						$(inputThing).prop('checked',true);
					}
					else {
							$(inputThing).prop('checked',false);
					}
				}
				else {
						$(inputThing).prop('checked',false);
				}
				//$(toBeAdded).on('change',function(){
				//	userSaveShowProgress(showID,href,this.checked);
				//});
				$(this).prepend(toBeAdded);
			}
		});
}

//provides a way for seconds to be converted to hours minutes and seconds
String.prototype.toHHMMSS = function () {
    var sec_num = parseInt(this, 10); // don't forget the second param
    var hours   = Math.floor(sec_num / 3600);
    var minutes = Math.floor((sec_num - (hours * 3600)) / 60);
    var seconds = sec_num - (hours * 3600) - (minutes * 60);

    if (hours   < 10) {hours   = "0"+hours;}
    if (minutes < 10) {minutes = "0"+minutes;}
    if (seconds < 10) {seconds = "0"+seconds;}
    return hours+'h '+minutes+'m '+seconds+'s';
}

function ConvertCast(castObject){
	var castList = "";
	for(var person in castObject){
		castList += castObject[person].name.name+" ("+castObject[person].char+"), "
	}
	return castList;
}

//Adds Movie Info
function movInfoDisplay(){
	//protect ourselves
		var meta = document.createElement('meta');
	meta.name = "referrer";
	meta.content = "no-referrer";
	document.getElementsByTagName('head')[0].appendChild(meta);
	var table = '<table class="movTable" id="movieShowInfo"></table>';

	if($('body > table:nth-child(4) > tbody > tr:nth-child(2) > td:nth-child(3) > table > tbody > tr:nth-child(3)').length==1){
		$('body > table:nth-child(4) > tbody > tr:nth-child(2) > td:nth-child(3) > table > tbody > tr:nth-child(3)').before('<tr><td>'+table+'</td></tr>');
	}
	else if($('body > table:nth-child(5) > tbody > tr:nth-child(2) > td:nth-child(3) > table > tbody > tr:nth-child(3)').length==1){
		$('body > table:nth-child(5) > tbody > tr:nth-child(2) > td:nth-child(3) > table > tbody > tr:nth-child(3)').before('<tr><td>'+table+'</td></tr>');
	}

	var tableSelector = $('#movieShowInfo');

	chrome.storage.sync.get("showMetadata",function(result){
		if(result.showMetadata===undefined || result.showMetadata==true){
			var movAPIUrl = APIUrl + $('a[href*="imdb"]').attr('href').split('/')[4];
			$.get(movAPIUrl,function(result){
				//console.log(result);

				if(result.data.plot && result.data.plot.outline){
					$(tableSelector).append(
						'<tr><td style="width:100px"><span>Plot</span></td><td class="plot"><span class="realPlot">'+
							result.data.plot.outline +'</span><span class="hoverThing">Hover for plot</span></td></tr>'
						);
				}
				if(result.data.release_date){
					$(tableSelector).append(
						'<tr><td><span>Released</span></td><td><span>'+
							new Date(result.data.release_date.normal).toLocaleDateString() +'</span></td></tr>'
						);
				}
				if(result.data.certificate){
					$(tableSelector).append(
						'<tr><td><span>Rated</span></td><td><span>'+
							result.data.certificate.certificate +'</span></td></tr>'
						);
				}
				if(result.data.cast_summary){
					$(tableSelector).append(
						'<tr><td><span>Cast</span></td><td><span>'+
							ConvertCast(result.data.cast_summary) +'</span></td></tr>'
						);
				}
				if(result.data.runtime && result.data.runtime.time){
					$(tableSelector).append(
						'<tr><td><span>Length</span></td><td><span>'+
							(result.data.runtime.time+"").toHHMMSS() + '</span></td></tr>'
						);
				}
				if(result.data.genres){
					$(tableSelector).append(
						'<tr><tr><td><span>Genre</span></td><td><span>'+
							//result.LEFTOFF +'</td></tr><tr><td class="leftoff">Left off:</td><td>'+
							result.data.genres +'</span></td></tr>'
						);
				}

				if(location.href.indexOf('tv=1')>-1){
					var ShowID = getCurrentShowID();
					var EpisodeID = getCurrentEpisodeID();
					GetKey('ChunkedShowProgress2',function(result){
						ImprovedShowProgress = result.ChunkedShowProgress2;
						if(ImprovedShowProgress &&
								ImprovedShowProgress[ShowID] &&
								ImprovedShowProgress[ShowID][EpisodeID] &&
								ImprovedShowProgress[ShowID][EpisodeID].userTimeElapsed){
							$(tableSelector).append(
								'<tr><td><span>Last Position</span></td><td><span>'+
									ImprovedShowProgress[ShowID][EpisodeID].userTimeElapsed + '</span></td></tr>'
							);
						}
					});
				}

			});
		}
	});
}


//TODO: if we're watching a show let's set a timer to watch the progress of it and at 90% mark it as watched
if(location.href.indexOf("tv=")!=-1){

	var hrefOfShow = location.href.substring(location.href.lastIndexOf('/'));

	//If we're in the latest show released lets mark it as seen so we don't show the 'New Episodes' text
	chrome.storage.sync.get('StoredLatestFavShows',function(result){
		StoredLatestFavShows = result.StoredLatestFavShows;
		if(StoredLatestFavShows){
			for(var showIndex in StoredLatestFavShows){
				if(StoredLatestFavShows[showIndex].link == hrefOfShow){
					StoredLatestFavShows[showIndex].seen=true;
					saveStoredLatestFavShows();
				}
			}
		}
	});
	//mark video as done if $('.jwtimeSliderThumb')[0].style.left > 90%
	//		or if js-progress exists    js-progress .style.width


	var showid = getCurrentShowID();

	//start the timer
	//every 30 seconds execute the function to get the progress of a show
	intervalID = setInterval(
		function(){ TimerForProgress(showid); }
		,30000);
}

function TimerForProgress(showidPassedIn){

		//get percentage of current show:
		var width = Math.round( parseFloat($('.jw-progress').css('width')) / parseFloat($('.jw-progress').parent().css('width')) * 100 ) ;

		var episodeID = getCurrentEpisodeID();
		var userTimeElapsed = $('.jw-text.jw-reset.jw-text-elapsed').text();
		if(width>EPISODE_SEEN_PERCENTAGE){
			//if(intervalID){
			//	clearInterval(intervalID);
			//}
			console.log('episodeID:'+episodeID);
			//ImprovedShowProgress[showidPassedIn][episodeID]
			if(ImprovedShowProgress[showidPassedIn]===undefined){
				ImprovedShowProgress[showidPassedIn] = {};
			}
		}
		if(width>1){
			SaveEpisodeProgress(showidPassedIn, episodeID, width, userTimeElapsed);
		}
		console.log(width+'%');
		//because I'm silly we store &tv=1 with the episode id...
}

function SaveEpisodeProgress(ShowID, EpisodeID, ProgressPercentage, userTimeElapsed){
	GetKey('ChunkedShowProgress2',function(result){
		if(result.ChunkedShowProgress2){
			ImprovedShowProgress = result.ChunkedShowProgress2;
			AddEpisodeToShowProgress(ShowID, EpisodeID, ProgressPercentage, userTimeElapsed);
		}
		else{
			chrome.storage.sync.get('ImprovedShowProgress',function(result){
				ImprovedShowProgress = result.ImprovedShowProgress;
				AddEpisodeToShowProgress(ShowID, EpisodeID, ProgressPercentage, userTimeElapsed);
			});
		}
	});
}

function AddEpisodeToShowProgress(ShowID, EpisodeID, ProgressPercentage, userTimeElapsed){
		if(ImprovedShowProgress===undefined){
			ImprovedShowProgress = {};
		}

		if(ImprovedShowProgress[ShowID]===undefined){
			ImprovedShowProgress[ShowID] = {};
		}
		if(ImprovedShowProgress[ShowID][EpisodeID]===undefined){
			ImprovedShowProgress[ShowID][EpisodeID] = {};
		}
		ImprovedShowProgress[ShowID][EpisodeID].percent = ProgressPercentage;
		ImprovedShowProgress[ShowID][EpisodeID].userTimeElapsed = userTimeElapsed;

		saveImprovedShowProgress();
}

function addNewImageToFavedShow(idOfShow){
	//var words = $('<span class="letters scale"><span class="cd-words-wrapper" style="width:100px"></span></span>');
	//$(words).append('<b class="is-visible"><i>N</i><i>E</i><i>W</i></b>');
	//$(words).append('<b><i>E</i><i>P</i><i>I</i><i>S</i><i>O</i><i>D</i><i>E</i><i>S</i></b>');
	var words = $('<span> - </span>'+
		'<span class="text-effect">'+
			'<span class="neon" data-text=" NEW EPISODE"> NEW EPISODE</span>'+
			'<span class="gradient"></span>'+
			'<span class="spotlight"></span>'+
		'</span>');

	//var words = $('<span>NEW EPISODE</span>')
	$('.favedShow_'+idOfShow+' > td:nth-child(2) > span').append($(words));
}

//alert(location);


function getCacheKey(key, i) {
	return (i === 0) ? key : key + "_" + i;
}

/**
 * Allows to save strings longer than QUOTA_BYTES_PER_ITEM in chrome.storage.sync by splitting them into smaller parts.
 * Please note that you still can't save more than QUOTA_BYTES.
 *
 * @param {string} key
 * @param {string} value
 * @param {function(): void=} callback
 */
function SetKey(key, valued, callback) {
	var i = 0,
		cache = {},
		segment,
		cacheKey;
	var value = JSON.stringify(valued);
	// split value into chunks and store them in an object indexed by `key_i`
	while(value.length > 0) {
		cacheKey = getCacheKey(key, i);
		//if you are wondering about -2 at the end see: https://code.google.com/p/chromium/issues/detail?id=261572
		segment = value.substr(0, chrome.storage.sync.QUOTA_BYTES_PER_ITEM - cacheKey.length - 2);
		cache[cacheKey] = segment;
		value = value.substr(chrome.storage.sync.QUOTA_BYTES_PER_ITEM - cacheKey.length - 2);
		i++;
	}

	// store all the chunks
	chrome.storage.sync.set(cache, callback);

	//we need to make sure that after the last chunk we have an empty chunk. Why this is so important?
	// Saving v1 of our object. Chrome sync status: [chunk1v1] [chunk2v1] [chunk3v1]
	// Saving v2 of our object (a bit smaller). Chrome sync status: [chunk1v2] [chunk2v2] [chunk3v1]
	// When reading this configuration back we will end up with chunk3v1 being appended to the chunk1v2+chunk2v2
	chrome.storage.sync.remove(getCacheKey(key, i));
};


/**
 * Retrieves chunks of value stored in chrome.storage.sync and combines them.
 *
 * @param {string} key
 * @param {function(string):void=} callback
 */
function GetKey(key, callback) {
	//get everything from storage
	chrome.storage.sync.get(null, function(items) {
		var i, value = "";

		for(i=0; i<chrome.storage.sync.MAX_ITEMS; i++) {
			if(items[getCacheKey(key, i)] === undefined) {
				break;
			}
			value += items[getCacheKey(key, i)];
		}
		var returnedObj = {};
		if(value==""){
			value=null;
		}
		else {
			returnedObj[key] = JSON.parse(value);
		}

		callback(returnedObj);
	});
};
