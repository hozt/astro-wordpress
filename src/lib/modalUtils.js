// src/lib/modalUtils.js
import dayjs from 'dayjs';

export function openModal(event) {
  const modalContainer = document.getElementById('modalContainer');
  const eventLocation = event.location ? `
    <div class="mb-2 text-sm event-location">
      <i class="icon-[mdi--location] relative top-0.5 icon-location"></i> ${event.location}
    </div>
  ` : '';

  const eventContent = event.content ? `<div class="my-2 event-content">${event.content}</div>` : '';

  modalContainer.innerHTML = `
    <div class="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50">
      <div class="p-4 bg-white rounded-lg">
        <div class="text-lg">${event.title}</div>
        ${eventContent}
        ${eventLocation}
        <div class="text-sm text-gray-500 event-start">${dayjs(event.startDatetime).format('MMMM D, YYYY h:mm A')}</div>
        <button id="closeModal" class="px-2 py-2 mt-4 text-sm text-white bg-secondary">Close</button>
      </div>
    </div>
  `;

  document.getElementById('closeModal').addEventListener('click', closeModal);
}

export function closeModal() {
  const modalContainer = document.getElementById('modalContainer');
  modalContainer.innerHTML = '';
}
