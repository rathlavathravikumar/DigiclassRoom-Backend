import crypto from 'crypto';
import zoomService from './zoomService.js';

/**
 * Meeting Service for generating meeting links and managing meeting providers
 * This is a basic implementation that can be extended to integrate with:
 * - Zoom API
 * - Google Meet API
 * - Microsoft Teams API
 * - Jitsi Meet
 * - Custom video conferencing solutions
 */

class MeetingService {
  constructor() {
    this.provider = process.env.MEETING_PROVIDER || 'jitsi'; // Default to Jitsi Meet
    this.baseUrl = this.getBaseUrl();
  }

  getBaseUrl() {
    switch (this.provider) {
      case 'zoom':
        return 'https://zoom.us/j/';
      case 'googlemeet':
        return 'https://meet.google.com/';
      case 'teams':
        return 'https://teams.microsoft.com/l/meetup-join/';
      case 'jitsi':
      default:
        return process.env.JITSI_BASE_URL || 'https://meet.jit.si/';
    }
  }

  /**
   * Generate a unique meeting ID
   */
  generateMeetingId() {
    const timestamp = Date.now().toString();
    const random = crypto.randomBytes(4).toString('hex');
    return `${timestamp}-${random}`;
  }

  /**
   * Generate meeting password
   */
  generateMeetingPassword() {
    return crypto.randomBytes(6).toString('hex');
  }

  /**
   * Create a meeting link based on the provider
   */
  async createMeeting(meetingData) {
    const { title, courseCode, teacherName, scheduledTime, duration } = meetingData;
    
    try {
      switch (this.provider) {
        case 'jitsi':
          return this.createJitsiMeeting(meetingData);
        case 'zoom':
          return await this.createZoomMeeting(meetingData);
        case 'googlemeet':
          return await this.createGoogleMeetMeeting(meetingData);
        default:
          return this.createJitsiMeeting(meetingData);
      }
    } catch (error) {
      console.error(`Error creating meeting with provider ${this.provider}:`, error.message);
      console.warn(`Falling back to Jitsi Meet due to ${this.provider} failure`);
      
      // Always fallback to Jitsi if any provider fails
      const fallbackResult = this.createJitsiMeeting(meetingData);
      console.log(`Successfully created fallback meeting with Jitsi: ${fallbackResult.meeting_link}`);
      return fallbackResult;
    }
  }

  /**
   * Create Jitsi Meet meeting (free, no API key required)
   */
  createJitsiMeeting(meetingData) {
    const { title, courseCode } = meetingData;
    const meetingId = this.generateMeetingId();
    const roomName = `${courseCode}-${meetingId}`.replace(/[^a-zA-Z0-9-]/g, '');
    
    return {
      meeting_id: meetingId,
      meeting_link: `${this.baseUrl}${roomName}`,
      meeting_password: '', // Jitsi doesn't require password by default
      provider: 'jitsi'
    };
  }

  /**
   * Create Zoom meeting using Zoom API
   */
  async createZoomMeeting(meetingData) {
    // Validate Zoom configuration
    zoomService.validateConfig();
    
    // Create meeting using Zoom API
    return await zoomService.createMeeting(meetingData);
  }

  /**
   * Create Google Meet meeting (requires Google API integration)
   * This is a placeholder - you'll need to implement Google Calendar API
   */
  async createGoogleMeetMeeting(meetingData) {
    // TODO: Implement Google Calendar API integration
    // You'll need to:
    // 1. Set up Google Cloud project
    // 2. Enable Calendar API
    // 3. Create calendar event with conferencing
    // 4. Return meeting details
    
    const meetingId = this.generateMeetingId();
    
    // Placeholder implementation
    return {
      meeting_id: meetingId,
      meeting_link: `${this.baseUrl}${meetingId}`,
      meeting_password: '',
      provider: 'googlemeet'
    };
  }

  /**
   * Delete/Cancel a meeting
   */
  async deleteMeeting(meetingId, provider) {
    try {
      switch (provider) {
        case 'zoom':
          await zoomService.deleteMeeting(meetingId);
          break;
        case 'googlemeet':
          // TODO: Call Google Calendar API to delete event
          break;
        case 'jitsi':
        default:
          // Jitsi rooms are automatically cleaned up
          break;
      }
      return true;
    } catch (error) {
      console.error(`Error deleting meeting (${provider}):`, error);
      throw new Error(`Failed to delete meeting: ${error.message}`);
    }
  }

  /**
   * Update meeting details
   */
  async updateMeeting(meetingId, provider, updateData) {
    try {
      switch (provider) {
        case 'zoom':
          await zoomService.updateMeeting(meetingId, updateData);
          break;
        case 'googlemeet':
          // TODO: Call Google Calendar API to update event
          break;
        case 'jitsi':
        default:
          // For Jitsi, we might need to generate a new room
          break;
      }
      return true;
    } catch (error) {
      console.error(`Error updating meeting (${provider}):`, error);
      throw new Error(`Failed to update meeting: ${error.message}`);
    }
  }
}

export default new MeetingService();
