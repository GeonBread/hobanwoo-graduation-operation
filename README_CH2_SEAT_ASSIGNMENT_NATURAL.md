# Chapter 2 #232 - 이용상태 '배정' natural typography fix

This patch replaces only the screen PNG:

public/assets/chapter2/story/ui/library_seat_20290415_2250_firstA_92.png

Fixes:
- Redraws `배정` directly into the original pure-white information row using matching dark-gray, bold Korean typography, baseline and x coordinate.
- Removes the gray rectangular sticker artifact and all remnants of `임시배정`.
- Removes notification icons beside the 22:50 status time without touching the battery/wifi icons on the right.
- All other screen elements and layout remain identical to the previous patch, including the 3-stage extension-time emphasis implemented in chapter2Story.html.

Apply to project root with your ZIP patch runner, or overwrite the same relative PNG path.
