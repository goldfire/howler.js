# About

These tests make sure the that Howler knows if it is being loaded
from an AMD loader like require.js or simply included on the page. 

If it is being loaded via require.js, it will define new require.js
modules. See [amd.html](amd.html) as an example of how this is done. 

If it is being loaded as a direct script src reference it will 
maintain its original behaviour of setting the global `Howler` and `Howl`
objects.
