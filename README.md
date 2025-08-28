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
> If you get stuck on any of the installation and setup steps, please don't hesitate to ask for help on the [sarna discord](https://discord.com/channels/845495550803705886).

- Download a current version of nodejs, the javascript runtime, from here: https://nodejs.org/en/download. If you are a
  Windows user, they have a Windows Installer (.msi) download available, which is the easiest way to get nodejs running
  quickly for most people.
- Run the installer. If it asks you about optionally installing python + chocolatey, you can safely skip that part.
- Download a version of sarna-maps (this repository) by clicking [here](https://github.com/sarna-net/sarna-maps/archive/refs/heads/main.zip).
- Unzip the contents of the downloaded .zip file into any local directory, say for example ``D:\sarna-maps``.
- Navigate to the directory in a text console. If you are running Windows, you can right click the directory icon in
  your File Explorer and click "Open in terminal". Alternatively, do the following:
  - Open a text console on your machine. In Windows, you can open one by using ``WinKey+R`` and typing
    ``cmd``, which will open the Windows command terminal.
  - In your text console, navigate to the script directory, e.g. by switching to the D drive by typing ``D:``, then
    changing directories by using the ``cd`` command, e.g. ``cd sarna-maps``
- Once you are inside the script directory (``D:\sarna-maps`` in our example), execute the following command once: ``npm i``.
  This installs a few libraries that the script depends upon. Setup is now complete. 

## Data source

This script comes "batteries included", i.e. with a fixed version (i.e. not necessarily the latest one) of the Sarna
Unified Cartography Kit (SUCKit), which is a spreadsheet (``.xlsx``) file that contains all the essential information
about Battletech's factions, planetary systems, as well as those systems' political affiliation in various eras
of the timeline.

The official hosted location of the SUCKit as a living document is
https://docs.google.com/spreadsheets/d/1uO6aZ20rfEcAZJ-nDRhCnaNUiCPemuoOOd67Zqi1MVM

The included version of this spreadsheet, by default, is located
in ``<script directory>/data/Sarna Unified Cartography Kit (Official).xlsx``.

You are of course free to modify this version of the SUCKit spreadsheet, just be aware that changing the file's
structure (adding columns, for instance) may lead to the mapping script no longer working as expected, so you may want
to back up the original file before making any changes.

If you want to pull a fresh version of the official SUCKit from the internet, you can go to the official version hosted
on Google and, in the top menu, click ``File`` > ``Download`` > ``.xlsx``.

<ins>Advanced users</ins> may also be interested in directly using the official Google sheet, without the need for a
manual download.
> **TODO** add documentation on how to configure direct Google access with an API key


## Generating maps

When it comes to actually generating the map images, the script requires a **generator configuration**, which is a
``.yaml`` file, usually located in the ``config`` subfolder of the main script directory.

The used generator configuration controls many different variables of map generation, such as:
- which eras to generate maps for
- which section of the battletech universe to depict 
- where the map files will be saved and what they will be named
- which color scheme to use (light or dark)
- plus many other options

> **TODO** add generator config documentation describing all different options

By default, the script comes with several example generator configurations, but you can easily define one yourself.
All you need is a ``.yaml`` file in the config subfolder that contains all necessary fields, and you can run the map
generator by executing the following command from the main script directory:

    npm start <config-filename>

e.g.

    npm start innersphere

The console output should tell you where your generated maps are saved, the default configurations 
