/**
 * @file modalUtils.js
 * @description Utility functions for managing modal open/close state.
 */
import { formatDateLong, formatTime } from './formatDate';

export function openModal(event) {
  const modalContainer = document.getElementById('modalContainer');
  const eventLocation = event.location ? `
    <div class="mb-2 text-sm event-location">
      <i class="icon-[mdi--location] relative top-0.5 icon-location"></i> ${event.location}
    </div>
  ` : '';

  const eventContent = event.content ? `<div class="my-2 event-content">${event.content}</div>` : '';

  modalContainer.innerHTML = `
    <div class="event-modal">
      <div class="content">
        <div class="title">${event.title}</div>
        ${eventContent}
        ${eventLocation}
        <div class="event-start">
          ${formatDateLong(event.startDatetime)}
          ${event.endDatetime ? ` - ${formatTime(event.endDatetime)}` : ''}
        </div>
        <button id="closeModal" class="button">Close</button>
      </div>
    </div>
  `;
  document.getElementById('closeModal').addEventListener('click', closeModal);
}

export function closeModal() {
  const modalContainer = document.getElementById('modalContainer');
  modalContainer.innerHTML = '';
}
