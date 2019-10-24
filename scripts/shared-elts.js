var placeholders = ['#topnav', '#footer'];
$(function() {  // Call this from DOM's .ready()
    for (var i = 0; i < placeholders.length; i++) {
        // Replace placeholders on this page with matching shared
        // elements in load.html
        $(placeholders[i]).load('load.html ' + placeholders[i] + '-shared');
    }
});
