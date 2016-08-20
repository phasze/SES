//alert("Hello from your Chrome extension!")
var StoredSCInfo = {};
var StoredFavShows = [];
var StoredFavMovies = [];
var APIUrl = "https://www.omdbapi.com/?plot=short&r=json&i="
var AlwaysLoadHD = false;
ShowProgress = {};

$('a[href="series.php"][style="color:#ffffff"]').attr('href','series.php?bl=1'); //replace the link at the top with a better one...

//Updates the data storage for storedShows
function updateShows(){
	chrome.storage.sync.get('storedShows',function(result){
		console.log(result);
		StoredFavShows = result.storedShows;
		if(StoredFavShows==null)
			StoredFavShows = [];
		UpdateRows();
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

chrome.storage.onChanged.addListener(function(changes, namespace) {
	for (key in changes) {
	  var storageChange = changes[key];
	  console.log('Storage key "%s" in namespace "%s" changed. ' +
				  'Old value was "%s", new value is "%s".',
				  key,
				  namespace,
				  storageChange.oldValue,
				  storageChange.newValue);
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
	
	updateShows();
	
}


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

// Adds the favorited movies to the saved for later section
function addToMovieFavorites(originator, lehMovId){
	var toBeAddedToFavorites = $('<span class="movFav"></span>');
	
	//clone the link and star
	toBeAddedToFavorites.append($(originator).prev().clone());
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
var re = /http(s|):\/\/superchillin\.(com|net)\/\?\d*(&s=\d*|)(&tv=1|)$/
var OK2 = re.exec(location.href); 
if(OK2 && $('a[href*="hd=1"]')) //On a non-HD page of a move/show
{
	chrome.storage.sync.get('AlwaysLoadHD',function(result){
		
		//console.log(result);
		if(result.AlwaysLoadHD!==undefined && result.AlwaysLoadHD==true && $('a[href*="hd=1"]').length>0) {
			chrome.storage.sync.set({'displayAlert': true, function() {}});
			
			location = $('a[href*="hd=1"]').attr('href');
		}
	});
	movInfoDisplay();
}
re = /http(s|):\/\/superchillin\.(com|net)\/\?\d*(&s=\d*|)(&tv=1|)(&s=\d*|)(&hd=1|)/
OK = re.exec(location.href); 
if(OK && !OK2) //on the HD page of a movie/show
{
	chrome.storage.sync.get('displayAlert',function(result){
		if(result.displayAlert==true){
			$('body').prepend('<div class="alert" onclick="this.style.display=\'none\';" id="notifyAlert"> Switched to HD </div>');
			//alert('display alert');
		
			setTimeout(function(){
				$("#notifyAlert").fadeOut("slow");
			},5000);
			
		
			chrome.storage.sync.set({'displayAlert': false, function() {}});
		}
	});
	movInfoDisplay();
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
		var idOfMe = $(this).find('a[href*="episodes"]').attr('href').substring(14);
		
		
		if(StoredFavShows != null && StoredFavShows.length>0 && $.inArray(idOfMe,StoredFavShows)!=-1){
			$(this).parent().parent().next('hr').remove();
			var toBeFav = $(this).detach();
			$('.scFavorites td:first').append(toBeFav);
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
}

//Save an episode
function userSaveShowProgress(showID, episodeID, checke){
	//alert('checked box for show '+showID+', episode '+episodeID+' checked:'+checke);
	if(ShowProgress===undefined){
		ShowProgress={};
	}
	if(ShowProgress[showID]===undefined){
		ShowProgress[showID] = [];
	}
	
	if(checke)
		ShowProgress[showID].push(episodeID);
	else{
		if(ShowProgress[showID].indexOf(episodeID)!=-1)
			ShowProgress[showID].splice(ShowProgress[showID].indexOf(episodeID),1);
	}
		
	chrome.storage.sync.set({'showProgress': ShowProgress}, function() {
		  // Notify that we saved.
		  console.log("Successfully saved ShowProgress.");
	});
}

//TODO: if we're on the episodes page let's cross off the one's we've already watched
//TODO: when on the episodes page compile a list of episodes so we can save it for later
var reEpisodes = /http(s|):\/\/superchillin\.(com|net)\/episodes\.php\?\d*$/
OK = reEpisodes.exec(location.href);
if(OK){
	var showID = location.href.split('?')[1];
	chrome.storage.sync.get('showProgress',function(result){
		ShowProgress = result.showProgress;
		
		
		var first = true;
		var imdex = 0
		$('b').each(function(){
			if(first){first=false;} //title is bolded, I hate having to use these selectors....
			else{
				var tempIndex = imdex;
				var toBeAdded = $('<input id="checlbox_'+tempIndex+'" type="checkbox">');
				if(ShowProgress!==undefined && ShowProgress[showID]!==undefined ){
					if($.inArray(tempIndex,ShowProgress[showID])!=-1){
						$(toBeAdded).prop('checked',true);
					}
				}
				$(toBeAdded).on('change',function(){
					userSaveShowProgress(showID,tempIndex,this.checked);
				});
				$(this).prepend(toBeAdded);
				imdex++;
			}
		});
	});
	
}

//Adds Movie Info
function movInfoDisplay(){
	chrome.storage.sync.get("showMetadata",function(result){
		if(result.showMetadata===undefined || result.showMetadata==true){
			var movAPIUrl = APIUrl + $('a[href*="imdb"]').attr('href').split('/')[4];
			$.get(movAPIUrl,function(result){
				console.log(result);
				
				var table = ('<table class="movTable"><tr><td style="width:80px"><span>Plot</span></td><td class="plot"><span class="realPlot">'+
						result.Plot +'</span><span class="hoverThing">Hover for plot</span></td></tr><tr><td><span>Released</span></td><td><span>'+
						result.Released +'</span></td></tr><tr><td><span>Rated</span></td><td><span>'+
						result.Rated +'</span></td></tr><tr><td><span>Cast</span></td><td><span>'+
						result.Actors +'</span></td></tr><tr><td><span>Length</span></td><td><span>'+
						result.Runtime +'</span></td></tr><tr><tr><td><span>Metascore</span></td><td><span>'+
						result.Metascore +'</span></td></tr><tr><td><span>Genre</span></td><td><span>'+
						//result.LEFTOFF +'</td></tr><tr><td class="leftoff">Left off:</td><td>'+
						result.Genre +'</span></td></tr></table>');
						
				$('body > table:nth-child(4) > tbody > tr:nth-child(2) > td:nth-child(3) > table > tbody > tr:nth-child(3)').before('<tr><td>'+table+'</td></tr>');
			});
		}
	});
}


//TODO: if we're watching a show let's set a timer to watch the progress of it and at 90% mark it as watched
if(location.href.indexOf("tv=")!=-1){
	
	//mark video as done if $('.jwtimeSliderThumb')[0].style.left > 90%
	//		or if js-progress exists    js-progress .style.width
	
}
	

//alert(location);