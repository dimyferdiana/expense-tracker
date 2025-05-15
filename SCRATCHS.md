<div class="hs-timepicker relative">
  <input
    type="text"
    class="py-2 px-3 block w-full border-gray-200 rounded-md text-sm focus:border-blue-500 focus:ring-blue-500"
    placeholder="hh:mm"
    autocomplete="off"
  />

  <!-- Dropdown Menu -->
  <div class="hidden hs-timepicker-toggle absolute z-10 mt-2 w-full bg-white border border-gray-200 rounded-lg shadow-md">
    <div class="flex justify-between p-4">
      <!-- Hours -->
      <div class="space-y-1 max-h-40 overflow-y-auto w-1/2 pr-2">
        <p class="text-xs font-semibold text-gray-500 px-2">Hour</p>
        <ul class="space-y-1">
          <!-- 00 to 23 -->
          <li><button type="button" class="w-full text-left px-2 py-1 hover:bg-blue-100 rounded">00</button></li>
          <li><button type="button" class="w-full text-left px-2 py-1 hover:bg-blue-100 rounded">01</button></li>
          <!-- ... -->
          <li><button type="button" class="w-full text-left px-2 py-1 hover:bg-blue-100 rounded">23</button></li>
        </ul>
      </div>

      <!-- Minutes -->
      <div class="space-y-1 max-h-40 overflow-y-auto w-1/2 pl-2">
        <p class="text-xs font-semibold text-gray-500 px-2">Minute</p>
        <ul class="space-y-1">
          <!-- 00 to 59 -->
          <li><button type="button" class="w-full text-left px-2 py-1 hover:bg-blue-100 rounded">00</button></li>
          <li><button type="button" class="w-full text-left px-2 py-1 hover:bg-blue-100 rounded">01</button></li>
          <!-- ... -->
          <li><button type="button" class="w-full text-left px-2 py-1 hover:bg-blue-100 rounded">59</button></li>
        </ul>
      </div>
    </div>
  </div>
</div>
