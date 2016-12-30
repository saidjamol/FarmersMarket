var map; // one map for this project
var infowindow; // one infowindow shared between all markers
var directionsDisplay; // one global for one route on the map at a time
var markersArr = [];
var filteredMarkets = [];
var activeMarketIndex;
var currentLocation = []; // index 0 holds lat & long and index 1 holds zip code
// var start;
// var geocoder;
// var lat;
// var long;

function myMap(position) {
    var myCenter = new google.maps.LatLng(37.3382082, -121.8863286);
    var mapCanvas = document.getElementById("map");
    var mapOptions = {
        center: myCenter,
        zoom: 12,
        mapTypeId: google.maps.MapTypeId.ROADMAP
    };
    map = new google.maps.Map(mapCanvas, mapOptions);
    geocoder = new google.maps.Geocoder;
    infowindow = new google.maps.InfoWindow();
    directionsDisplay = new google.maps.DirectionsRenderer({map: map});
}

function findMarkets(zip) {
    $("#map").addClass("loading");
    clearMap();
    markersArr = [];
    $.get("http://search.ams.usda.gov/farmersmarkets/v1/data.svc/zipSearch?zip=" + zip, function(response){getMarketData(response);}, "json");
    function getMarketData(response) {
        var marketArr = [];
        for(var i = 0; i < response["results"].length; i++) {
            marketArr.push(response["results"][i]["id"]);
        }
        $.get("localdata", function(response){saveData(response, marketArr);}, "json");
    }
}

function saveData(response, marketArr) {
     filteredMarkets = [];
     for(var i = 0; i < response.length; i++) {
         for(var j = 0; j < marketArr.length; j++) {
             if(response[i]["FMID"] == marketArr[j]) {
                 filteredMarkets.push(response[i]);
             }
         }
     }
     var infokeys = ["MarketName", "Season1Time", "street", "city", "State", "Website"]; //added a key for directions
     for(var marketIndex = 0; marketIndex < filteredMarkets.length; marketIndex++) {
         var content = '<div class="infowindow">';
         for(var m = 0; m < infokeys.length; m++) {
             if(filteredMarkets[marketIndex][infokeys[m]] != "") {
                 if(infokeys[m] == "Website") {
                     content += '<p><a href="'+filteredMarkets[marketIndex][infokeys[m]]+'">'+filteredMarkets[marketIndex][infokeys[m]]+'</a></p>';
                 }
                 else {
                     content += "<p>"+filteredMarkets[marketIndex][infokeys[m]]+"</p>";
                 }
             }
         }
         content += '<p><button class="infobutton" onclick="goToWall()" type="button" name="comments" value="'+marketIndex+'">View Comments</button></p>';
        //  content += '<p><a href="javascript:goToWall()">View Comments</a></p>';
         content += '<p><button class="infobutton" onclick="getDirections()" type="button" name="directions">Get Directions</button></p>';
         content += "</div>";
         addMarkerToMap(filteredMarkets[marketIndex]["y"], filteredMarkets[marketIndex]["x"], content, marketIndex);
     }
     $("#map").removeClass("loading");
 }

 function getDirections() {
     $("#map").addClass("loading");
     clearMap();
     markersArr = [];
     if(currentLocation[0] == null) {
         currentLocation[0] = getLocation(function(){
             finish = filteredMarkets[activeMarketIndex].y + "," + filteredMarkets[activeMarketIndex].x;
             calculateRoute(currentLocation[0], finish);
         });
     }
     else {
         finish = filteredMarkets[activeMarketIndex].y + "," + filteredMarkets[activeMarketIndex].x;
         calculateRoute(currentLocation[0], finish);
     }
 }

 function calculateRoute(from, to) {
     var directionsService = new google.maps.DirectionsService();
     var directionsRequest = {
       origin: from,
       destination: to,
       travelMode: google.maps.DirectionsTravelMode.DRIVING,
       unitSystem: google.maps.UnitSystem.METRIC
     };
     directionsService.route(
       directionsRequest,
       function(response, status)
       {
         if (status == google.maps.DirectionsStatus.OK)
         {
           directionsDisplay.setOptions({map: map, directions: response});
         }
         else
           $("#error").append("Unable to retrieve your route<br />");

       }
     );
     $("#map").removeClass("loading");
 }

function getLocation(callback) { // chained getLocation with showPosition, showError and geocodeLatLong so I can callback findMarkets AFTER the zip code has been obtained in geocodeLatLong
    clearMap();
    markersArr = [];
    if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(showPosition, showError);
    } else {
        document.getElementById("map").innerHTML = "Geolocation is not supported by this browser.";
    }
    function showPosition(position) {
        lat = position.coords.latitude;
        lng = position.coords.longitude;
        currentLocation[0] = lat+","+lng;
        // addMarkerToMap(lat, lng);
        geocodeLatLong(lat, lng, geocoder, map);
    }
    function showError(error) {
        switch(error.code) {
            case error.PERMISSION_DENIED:
                document.getElementById("map").innerHTML = "User denied the request for Geolocation."
                break;
            case error.POSITION_UNAVAILABLE:
                document.getElementById("map").innerHTML = "Location information is unavailable."
                break;
            case error.TIMEOUT:
                document.getElementById("map").innerHTML = "The request to get user location timed out."
                break;
            case error.UNKNOWN_ERROR:
                document.getElementById("map").innerHTML = "An unknown error occurred."
                break;
        }
    }
    function geocodeLatLong(lat, lng, geocoder, map) { // function geocodeLatLong(geocoder, map, zipcode). is zipcode needed here?
        var latlng = {lat: parseFloat(lat), lng: parseFloat(lng)};
        geocoder.geocode({'location': latlng}, function(results, status) {
            if (status === 'OK') {
              if (results[1]) {
                  currentLocation[1] = getZipFromGeo(results);
                  callback(currentLocation[1]);
              } else {
                window.alert('No results found');
              }
            } else {
              window.alert('Geocoder failed due to: ' + status);
            }
          });
    }
}

function addMarkerToMap(lat, lng, content, marketIndex){
    var myLatLng = new google.maps.LatLng(lat, lng);
    var marker = new google.maps.Marker({
        position: myLatLng,
        zoom: 12,
        map: map,
        // animation: google.maps.Animation.DROP,
        marketIndex: marketIndex,
    });
    marker.addListener("mouseover", function(){
        infowindow.setContent(content);
        infowindow.open(map, marker);
        activeMarketIndex = this.marketIndex;
    });
    markersArr.push(marker);
    map.panTo(myLatLng)
}

function getZipFromGeo(geoResults) {
    zipRegex = /^\d{5}$/;
    for(var i = 0; i < geoResults.length; i++) {
        for(var j = geoResults[i].address_components.length - 1; j >= 0; j--) {
            if (zipRegex.test(geoResults[i].address_components[j].long_name)) {
                return geoResults[i].address_components[j].long_name;
            }
        }
    }
}

function goToWall() {
    $.post("/js2py", {"market": filteredMarkets[activeMarketIndex], "csrfmiddlewaretoken": getCookie("csrftoken")}, window.location.href = "/marketwall");
}

function getCookie(name) {
    var cookieValue = null;
    if (document.cookie && document.cookie !== '') {
        var cookies = document.cookie.split(';');
        for (var i = 0; i < cookies.length; i++) {
            var cookie = $.trim(cookies[i]);
            // Does this cookie string begin with the name we want?
            if (cookie.substring(0, name.length + 1) === (name + '=')) {
                cookieValue = decodeURIComponent(cookie.substring(name.length + 1));
                break;
            }
        }
    }
    return cookieValue;
}

function clearMap(){
    if (directionsDisplay != null) {
        directionsDisplay.setMap(null);
    }
    for(var i = 0; i < markersArr.length; i++) {
        if(markersArr[i]) {
            markersArr[i].setMap(null);
            markersArr[i] = null;
        }
    }
}
