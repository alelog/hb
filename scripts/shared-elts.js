/*
 * Copyright (c) 2019 Alexey Loginov
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

"use strict";

const PLACEHOLDERS = ["#topnav", "#footer"];
$(function () {
  // Call this from DOM's .ready()
  for (let i = 0; i < PLACEHOLDERS.length; i++) {
    // Replace placeholders on this page with matching shared
    // elements in load.html
    $(PLACEHOLDERS[i]).load("load.html " + PLACEHOLDERS[i] + "-shared");
  }
});
