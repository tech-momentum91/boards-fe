import axios from '@/api/axios';

/**
 * Frappe Helpdesk Ticket Comments API Service
 */
class TicketCommentsService {
  /**
   * Get ticket activities (comments, history, communications, etc.)
   * @param {string} ticketId - The ticket ID
   * @returns {Promise} API response with comments data
   */
  async getTicketActivities(ticketId) {
    try {
      const response = await axios.post(
        '/api/method/devx.api.ticket.get_ticket_activities_filtered',
        {
          ticket: ticketId,
        },
      );

      return response.data;
    } catch (error) {
      console.error('Failed to fetch ticket activities:', error);
      throw error;
    }
  }

  /**
   * Add a comment to a ticket
   * @param {string} ticketId - The ticket ID
   * @param {string} content - HTML content of the comment
   * @param {Array} attachments - Array of file attachments
   * @param {boolean} isVisibleToClient - Whether comment is visible to client
   * @returns {Promise} API response
   */
  async addComment(ticketId, content, attachments = [], isVisibleToClient = false) {
    try {
      const response = await axios.post(
        '/api/method/helpdesk.helpdesk.doctype.hd_ticket.api.add_comment',
        {
          ticket: ticketId,
          content,
          attachments,
          visible_to_client: isVisibleToClient ? 1 : 0,
        },
      );

      return response.data;
    } catch (error) {
      console.error('Failed to add comment:', error);
      throw error;
    }
  }

  /**
   * Pin or unpin a comment
   * @param {string} commentId - The comment ID
   * @param {boolean} isPinned - Whether to pin or unpin
   * @returns {Promise} API response
   */
  async toggleCommentPin(commentId, isPinned) {
    try {
      const response = await axios.post(
        '/api/method/helpdesk.helpdesk.doctype.hd_ticket.api.toggle_comment_pin',
        {
          comment: commentId,
          is_pinned: isPinned ? 1 : 0,
        },
      );

      return response.data;
    } catch (error) {
      console.error('Failed to toggle comment pin:', error);
      throw error;
    }
  }

  /**
   * Upload file attachment
   * @param {File} file - The file to upload
   * @param {string} ticketId - The ticket ID
   * @returns {Promise} API response with file info
   */
  async uploadAttachment(file, ticketId) {
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('doctype', 'HD Ticket');
      formData.append('docname', ticketId);
      formData.append('is_private', 0);

      const response = await axios.post('/api/method/upload_file', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      return response.data;
    } catch (error) {
      console.error('Failed to upload attachment:', error);
      throw error;
    }
  }

  /**
   * Delete a comment
   * @param {string} commentId - The comment ID
   * @returns {Promise} API response
   */
  async deleteComment(commentId) {
    try {
      const response = await axios.post(
        '/api/method/helpdesk.helpdesk.doctype.hd_ticket.api.delete_comment',
        {
          comment: commentId,
        },
      );

      return response.data;
    } catch (error) {
      console.error('Failed to delete comment:', error);
      throw error;
    }
  }

  /**
   * Edit a comment
   * @param {string} commentId - The comment ID
   * @param {string} content - New HTML content
   * @returns {Promise} API response
   */
  async editComment(commentId, content) {
    try {
      const response = await axios.post(
        '/api/method/helpdesk.helpdesk.doctype.hd_ticket.api.edit_comment',
        {
          comment: commentId,
          content,
        },
      );

      return response.data;
    } catch (error) {
      console.error('Failed to edit comment:', error);
      throw error;
    }
  }
}

// Create and export a singleton instance
const ticketCommentsService = new TicketCommentsService();

export default ticketCommentsService;
