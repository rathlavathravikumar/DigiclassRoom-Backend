import axios from 'axios';
import crypto from 'crypto';

/**
 * Zoom API Service for OAuth authentication and meeting management
 * Handles Zoom OAuth flow and meeting CRUD operations
 */
class ZoomService {
  constructor() {
    this.baseUrl = 'https://api.zoom.us/v2';
    this.oauthUrl = 'https://zoom.us/oauth';
    this.accessToken = null;
    this.tokenExpiry = null;
    this._initialized = false;
  }

  _initialize() {
    if (!this._initialized) {
      this.accountId = process.env.ZOOM_ACCOUNT_ID;
      this.clientId = process.env.ZOOM_CLIENT_ID;
      this.clientSecret = process.env.ZOOM_CLIENT_SECRET;
      this._initialized = true;
    }
  }

  /**
   * Generate Server-to-Server OAuth token
   * This is for account-level access without user interaction
   */
  async getAccessToken() {
    this._initialize();
    
    // Check if we have a valid token
    if (this.accessToken && this.tokenExpiry && new Date() < this.tokenExpiry) {
      return this.accessToken;
    }

    try {
      const credentials = Buffer.from(`${this.clientId}:${this.clientSecret}`).toString('base64');
      
      const response = await axios.post(
        `${this.oauthUrl}/token`,
        new URLSearchParams({
          grant_type: 'account_credentials',
          account_id: this.accountId
        }),
        {
          headers: {
            'Authorization': `Basic ${credentials}`,
            'Content-Type': 'application/x-www-form-urlencoded'
          }
        }
      );

      this.accessToken = response.data.access_token;
      // Set expiry to 5 minutes before actual expiry for safety
      this.tokenExpiry = new Date(Date.now() + (response.data.expires_in - 300) * 1000);
      
      return this.accessToken;
    } catch (error) {
      console.error('Error getting Zoom access token:', error.response?.data || error.message);
      throw new Error('Failed to authenticate with Zoom API');
    }
  }

  /**
   * Make authenticated API call to Zoom
   */
  async makeApiCall(method, endpoint, data = null) {
    const token = await this.getAccessToken();
    
    try {
      const config = {
        method,
        url: `${this.baseUrl}${endpoint}`,
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      };

      if (data) {
        config.data = data;
      }

      const response = await axios(config);
      return response.data;
    } catch (error) {
      console.error(`Zoom API call failed (${method} ${endpoint}):`, error.response?.data || error.message);
      throw new Error(`Zoom API error: ${error.response?.data?.message || error.message}`);
    }
  }

  /**
   * Create a Zoom meeting
   */
  async createMeeting(meetingData) {
    const { title, description, scheduledTime, duration, courseCode, teacherName } = meetingData;

    // Get the default user (first user in the account) to host the meeting
    const users = await this.makeApiCall('GET', '/users?status=active&page_size=1');
    if (!users.users || users.users.length === 0) {
      throw new Error('No active users found in Zoom account');
    }

    const hostUserId = users.users[0].id;

    const meetingPayload = {
      topic: title,
      type: 2, // Scheduled meeting
      start_time: new Date(scheduledTime).toISOString(),
      duration: duration,
      timezone: 'UTC',
      agenda: description || `Online class for ${courseCode}`,
      settings: {
        host_video: true,
        participant_video: true,
        cn_meeting: false,
        in_meeting: false,
        join_before_host: false,
        mute_participants_upon_entry: true,
        watermark: false,
        use_pmi: false,
        approval_type: 2, // No registration required
        audio: 'both',
        auto_recording: 'none',
        enforce_login: false,
        waiting_room: true,
        allow_multiple_devices: true
      }
    };

    try {
      const meeting = await this.makeApiCall('POST', `/users/${hostUserId}/meetings`, meetingPayload);
      
      return {
        meeting_id: meeting.id.toString(),
        meeting_link: meeting.join_url,
        meeting_password: meeting.password || '',
        provider: 'zoom',
        zoom_meeting_id: meeting.id,
        host_id: meeting.host_id,
        start_url: meeting.start_url
      };
    } catch (error) {
      console.error('Error creating Zoom meeting:', error);
      throw error;
    }
  }

  /**
   * Update a Zoom meeting
   */
  async updateMeeting(meetingId, updateData) {
    const { title, description, scheduledTime, duration } = updateData;

    const meetingPayload = {};
    if (title) meetingPayload.topic = title;
    if (description) meetingPayload.agenda = description;
    if (scheduledTime) {
      meetingPayload.start_time = new Date(scheduledTime).toISOString();
    }
    if (duration) meetingPayload.duration = duration;

    try {
      await this.makeApiCall('PATCH', `/meetings/${meetingId}`, meetingPayload);
      return true;
    } catch (error) {
      console.error('Error updating Zoom meeting:', error);
      throw error;
    }
  }

  /**
   * Delete a Zoom meeting
   */
  async deleteMeeting(meetingId) {
    try {
      await this.makeApiCall('DELETE', `/meetings/${meetingId}`);
      return true;
    } catch (error) {
      console.error('Error deleting Zoom meeting:', error);
      throw error;
    }
  }

  /**
   * Get meeting details
   */
  async getMeeting(meetingId) {
    try {
      return await this.makeApiCall('GET', `/meetings/${meetingId}`);
    } catch (error) {
      console.error('Error getting Zoom meeting:', error);
      throw error;
    }
  }

  /**
   * List meetings for a user
   */
  async listMeetings(userId = 'me', type = 'scheduled') {
    try {
      return await this.makeApiCall('GET', `/users/${userId}/meetings?type=${type}`);
    } catch (error) {
      console.error('Error listing Zoom meetings:', error);
      throw error;
    }
  }

  /**
   * Get meeting participants
   */
  async getMeetingParticipants(meetingId) {
    try {
      return await this.makeApiCall('GET', `/meetings/${meetingId}/participants`);
    } catch (error) {
      console.error('Error getting meeting participants:', error);
      throw error;
    }
  }

  /**
   * Validate Zoom configuration
   */
  validateConfig() {
    this._initialize();
    
    if (!this.accountId || !this.clientId || !this.clientSecret) {
      throw new Error('Zoom configuration incomplete. Please check ZOOM_ACCOUNT_ID, ZOOM_CLIENT_ID, and ZOOM_CLIENT_SECRET environment variables.');
    }
    return true;
  }
}

export default new ZoomService();
