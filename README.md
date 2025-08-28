# Sarna Maps

Generator for high quality SVG maps of the Battletech universe, as used on
[sarna.net](https://www.sarna.net).

## Content

- [Setup](#setup)
- [Data source](#data-source)
- [Generating maps](#generating-maps)

## Setup

The script can be downloaded and set up locally on your machine. To do so, follow the steps as described below.

> [!TIP]
> If you get stuck on any of the installation and setup steps, please don't hesitate to ask for help on the
> [Sarna Discord Server](https://discord.com/channels/845495550803705886).

- Download a current version of nodejs, the javascript runtime, from here: https://nodejs.org/en/download. If you are a
  Windows user, they have a Windows Installer (.msi) download available, which is the easiest way to get nodejs running
  quickly for most people.
- Run the installer. If it asks you about optionally installing python + chocolatey, you can safely skip that part.
- Download a version of sarna-maps (this repository) by clicking [here](https://github.com/sarna-net/sarna-maps/archive/refs/heads/main.zip).
- The downloaded .zip file should contain one directory named ``sarna-maps-main``. Unzip this directory's contents into
  any local directory, say for example ``D:\sarna-maps``. We will call this directory the *script directory* from now on.
- Navigate to the script directory in a text console. If you are running Windows, you can simply right click the 
  directory's icon in your File Explorer and click "Open in terminal". Alternatively, do the following:
  - Open a text console on your machine. In Windows, you can open one by using ``WinKey+R`` and typing
    ``cmd``, which will open the Windows command terminal.
  - In your text console, navigate to the script directory, e.g. by switching to the D drive by typing ``D:``, then
    changing directories by using the ``cd`` command, e.g. ``cd sarna-maps``
- Once you are inside the script directory (``D:\sarna-maps`` in our example), execute the following command:

      npm ci

  This installs a few libraries that the script depends upon, it should only take a minute or so. Setup is now complete. 

## Data source

This script comes "batteries included", i.e. with a fixed version (not necessarily the latest one) of the Sarna
Unified Cartography Kit (SUCKit), which is a spreadsheet (``.xlsx``) file that contains all the essential information
about Battletech's factions and planetary systems, as well as those systems' political affiliation in various eras
of the timeline.

The location of the official SUCKit as a living document is
https://docs.google.com/spreadsheets/d/1uO6aZ20rfEcAZJ-nDRhCnaNUiCPemuoOOd67Zqi1MVM

The included offline version of this spreadsheet, by default, is located
in ``<script directory>/data/Sarna Unified Cartography Kit (Official).xlsx``.

You are of course free to modify this version of the SUCKit spreadsheet, just be aware that changing the file's
structure (adding columns, for instance) may lead to the mapping script no longer working as expected, so you may want
to back up the original file before making any changes.

If you want to pull a fresh version of the official SUCKit from the internet, you can go to the official version hosted
on Google (see link above) and, in the top menu, click ``File`` > ``Download`` > ``.xlsx``.

<ins>Advanced users</ins> may also be interested in directly using the official Google sheet, without the need for a
manual download.
> **TODO** add documentation on how to configure direct Google access with an API key


## Generating maps

When it comes to actually generating the map images, the script requires a *generator configuration*, which is a
``.yaml`` file, usually located in the ``config`` subfolder of the main script directory.

Whenever you run the script, you tell it to use one specific generator configuration. This configuration controls
many different aspects of the map generation process, such as:
- which eras to generate maps for
- which section of the battletech universe to depict 
- where the map files will be saved and what they will be named
- which color scheme to use (light or dark)
- ... plus *many* other options

> **TODO** add generator config documentation describing all different options

By default, the script comes with several example generator configurations, but you can easily define one yourself.
All you need is a valid ``.yaml`` file in the config subfolder that contains all necessary fields, and you can run the
map generator by executing the following command from the main script directory:

    npm start <config-filename>

e.g.

    npm start innersphere

The console output should tell you where your generated maps are saved. The default configurations will save them to 
the ``out/`` subfolder.
