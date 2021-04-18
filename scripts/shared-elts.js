"use strict";

const PLACEHOLDERS = ['#topnav', '#footer'];
$(function() {  // Call this from DOM's .ready()
    for (let i = 0; i < PLACEHOLDERS.length; i++) {
        // Replace placeholders on this page with matching shared
        // elements in load.html
        $(PLACEHOLDERS[i]).load('load.html ' + PLACEHOLDERS[i] + '-shared');
    }
});
