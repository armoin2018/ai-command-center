import axios, { AxiosInstance } from 'axios';
import { createHash } from 'crypto';
import { TimeTapConfig, TimeTapTier, getTierCapabilities, TierCapabilities } from './config.js';

export class TimeTapClient {
  private axios: AxiosInstance;
  private config: TimeTapConfig;
  private detectedTier?: TimeTapTier;
  private sessionToken?: string;
  private tokenExpiry?: number;

  constructor(config: TimeTapConfig) {
    this.config = config;

    this.axios = axios.create({
      baseURL: config.apiUrl,
      headers: { 'Content-Type': 'application/json' },
    });

    // Auto-refresh on 401
    this.axios.interceptors.response.use(
      (response) => response,
      async (error) => {
        if (error.response?.status === 401 && !error.config._retry) {
          error.config._retry = true;
          await this.authenticate();
          error.config.headers['Authorization'] = `Bearer ${this.sessionToken}`;
          return this.axios.request(error.config);
        }
        if (error.response) {
          const { status, data } = error.response;
          if (status === 429) {
            throw new Error('Rate limit exceeded. Reduce request frequency or upgrade account tier.');
          }
          throw new Error(`TimeTap API Error ${status}: ${typeof data === 'string' ? data : JSON.stringify(data)}`);
        }
        throw error;
      }
    );
  }

  // ── Authentication ─────────────────────────────────────────────────

  private computeSignature(): string {
    const { apiKey, privateKey } = this.config;
    return createHash('md5').update(`${apiKey}${privateKey}`).digest('hex');
  }

  async authenticate(): Promise<string> {
    const timestamp = Math.floor(Date.now() / 1000);
    const signature = this.computeSignature();

    const response = await axios.get(`${this.config.apiUrl}/sessionToken`, {
      params: {
        apiKey: this.config.apiKey,
        timestamp,
        signature,
      },
    });

    this.sessionToken = response.data;
    this.tokenExpiry = Date.now() + 4 * 60 * 60 * 1000; // 4 hours
    this.axios.defaults.headers['Authorization'] = `Bearer ${this.sessionToken}`;
    return this.sessionToken!;
  }

  private async ensureAuth(): Promise<void> {
    if (!this.sessionToken || (this.tokenExpiry && Date.now() > this.tokenExpiry - 60000)) {
      await this.authenticate();
    }
  }

  // ── Tier Detection ─────────────────────────────────────────────────

  async detectTier(): Promise<TimeTapTier> {
    if (this.detectedTier) return this.detectedTier;
    if (this.config.tier) {
      this.detectedTier = this.config.tier;
      return this.detectedTier;
    }

    await this.ensureAuth();

    try {
      // Count staff to estimate tier
      const staff = await this.listStaff();
      const staffCount = Array.isArray(staff) ? staff.length : 0;

      // Count locations
      const locations = await this.listLocations();
      const locationCount = Array.isArray(locations) ? locations.length : 0;

      // Try enterprise endpoint
      try {
        await this.get('/enterpriseChild');
        this.detectedTier = 'enterprise';
        return this.detectedTier;
      } catch { /* not enterprise */ }

      if (staffCount > 5 || locationCount > 3) {
        this.detectedTier = 'business';
      } else if (staffCount > 1 || locationCount > 1) {
        this.detectedTier = 'professional';
      } else {
        this.detectedTier = 'professional'; // API access implies at least Professional
      }

      console.log(`Detected tier: ${this.detectedTier}`);
      return this.detectedTier;
    } catch {
      this.detectedTier = 'professional';
      return this.detectedTier;
    }
  }

  checkFeature(feature: keyof TierCapabilities): void {
    const tier = this.detectedTier || this.config.tier || 'professional';
    const caps = getTierCapabilities(tier);
    const value = caps[feature];
    if (typeof value === 'boolean' && !value) {
      throw new Error(`Feature "${feature}" is not available in ${tier} tier. Upgrade required.`);
    }
  }

  // ── HTTP Methods ───────────────────────────────────────────────────

  async get<T = any>(path: string, params?: any): Promise<T> {
    await this.ensureAuth();
    const response = await this.axios.get(path, { params });
    return response.data;
  }

  async post<T = any>(path: string, data?: any, params?: any): Promise<T> {
    await this.ensureAuth();
    const response = await this.axios.post(path, data, { params });
    return response.data;
  }

  async put<T = any>(path: string, data?: any): Promise<T> {
    await this.ensureAuth();
    const response = await this.axios.put(path, data);
    return response.data;
  }

  async delete<T = any>(path: string): Promise<T> {
    await this.ensureAuth();
    const response = await this.axios.delete(path);
    return response.data;
  }

  // ── Appointments ───────────────────────────────────────────────────

  async listAppointments(params?: {
    startDate?: string; endDate?: string; statusList?: string;
    staffIdList?: string; locationIdList?: string; clientIdList?: string;
    pageNumber?: number; pageSize?: number;
    order_field?: string; order_mode?: string;
  }): Promise<any> {
    return this.get('/appointmentList/reportWithCount', params);
  }

  async getAppointment(calendarId: number): Promise<any> {
    return this.get(`/appointments/${calendarId}`);
  }

  async createAppointment(appointment: any, override?: boolean): Promise<any> {
    return this.post('/appointments', appointment, override ? { override: 1 } : undefined);
  }

  async updateAppointment(calendarId: number, appointment: any): Promise<any> {
    return this.put(`/appointments/${calendarId}`, appointment);
  }

  async cancelAppointment(calendarId: number, sendStaffEmail: boolean, sendClientEmail: boolean, waitListIds?: string): Promise<any> {
    return this.put(`/appointments/${calendarId}/cancel/${sendStaffEmail}/${sendClientEmail}`, waitListIds ? { waitListIds } : undefined);
  }

  async completeAppointment(calendarId: number, sendClientEmail: boolean, reason?: string): Promise<any> {
    return this.put(`/appointments/${calendarId}/completed/${sendClientEmail}`, reason ? { reason, subStatus: 'COMPLETED' } : undefined);
  }

  async noShowAppointment(calendarId: number, sendClientEmail: boolean, reason?: string): Promise<any> {
    return this.put(`/appointments/${calendarId}/noshow/${sendClientEmail}`, reason ? { reason, subStatus: 'NO_SHOW' } : undefined);
  }

  async quickAddAppointment(data: { businessId: number; professionalId: number; startDate: string; startTime: number; endDate: string; endTime: number }): Promise<any> {
    return this.post('/appointments/quickAdd', data);
  }

  async getAppointmentCountsByStatus(params?: any): Promise<any> {
    return this.get('/appointmentList/reportCountsByStatus', params);
  }

  async checkWaitList(calendarId: number): Promise<any> {
    return this.get(`/appointments/${calendarId}/checkWaitList`);
  }

  // ── Clients ────────────────────────────────────────────────────────

  async listClients(params?: {
    pageNumber?: number; pageSize?: number;
    order_field?: string; order_mode?: string;
  }): Promise<any> {
    return this.get('/clients', params);
  }

  async getClient(clientId: number): Promise<any> {
    return this.get(`/clients/${clientId}`);
  }

  async createClient(client: any): Promise<any> {
    return this.post('/clients', client);
  }

  async updateClient(clientId: number, client: any): Promise<any> {
    return this.put(`/clients/${clientId}`, client);
  }

  async patchClient(clientId: number, partialClient: any): Promise<any> {
    await this.ensureAuth();
    const response = await this.axios.patch(`/clients/${clientId}`, partialClient);
    return response.data;
  }

  async deleteClient(clientId: number): Promise<any> {
    return this.delete(`/clients/${clientId}`);
  }

  async searchClients(searchTerm: string): Promise<any> {
    return this.post('/clients/filter', searchTerm);
  }

  async dupeCheckByEmail(email: string): Promise<any> {
    return this.post('/clients/dupecheck/email', email);
  }

  async mergeClients(targetClientId: number, clientsToMerge: any[]): Promise<any> {
    return this.post(`/clients/merge/${targetClientId}`, clientsToMerge);
  }

  async getClientCount(): Promise<number> {
    return this.get('/clients/count');
  }

  async getClientTags(): Promise<string[]> {
    return this.get('/clients/tags');
  }

  async listClientsReport(params?: any): Promise<any> {
    return this.get('/clientList/reportWithCount', params);
  }

  // ── Staff ──────────────────────────────────────────────────────────

  async listStaff(): Promise<any> {
    return this.get('/staff');
  }

  async getStaffMember(professionalId: number): Promise<any> {
    return this.get(`/staff/${professionalId}`);
  }

  async createStaffMember(staff: any): Promise<any> {
    return this.post('/staff', staff);
  }

  async updateStaffMember(professionalId: number, staff: any): Promise<any> {
    return this.put(`/staff/${professionalId}`, staff);
  }

  async deleteStaffMember(professionalId: number): Promise<any> {
    return this.delete(`/staff/${professionalId}`);
  }

  // ── Services (Reasons) ────────────────────────────────────────────

  async listServices(params?: { locationId?: number; staffId?: number; inactive?: boolean }): Promise<any> {
    return this.get('/services', params);
  }

  async getService(reasonId: number): Promise<any> {
    return this.get(`/services/${reasonId}`);
  }

  async createService(service: any): Promise<any> {
    return this.post('/services', service);
  }

  async updateService(reasonId: number, service: any): Promise<any> {
    return this.put(`/services/${reasonId}`, service);
  }

  async deleteService(reasonId: number): Promise<any> {
    return this.delete(`/services/${reasonId}`);
  }

  async getServiceStaff(reasonId: number): Promise<any> {
    return this.get(`/services/${reasonId}/serviceStaff`);
  }

  async updateServiceStaff(reasonId: number, data: any): Promise<any> {
    return this.post(`/services/${reasonId}/serviceStaff`, data);
  }

  async getReasonIdList(params?: any): Promise<number[]> {
    return this.get('/reasonIdList', params);
  }

  // ── Locations ──────────────────────────────────────────────────────

  async listLocations(): Promise<any> {
    return this.get('/locations');
  }

  async getLocation(locationId: number): Promise<any> {
    return this.get(`/locations/${locationId}`);
  }

  async createLocation(location: any): Promise<any> {
    return this.post('/locations', location);
  }

  async updateLocation(locationId: number, location: any): Promise<any> {
    return this.put(`/locations/${locationId}`, location);
  }

  async deleteLocation(locationId: number): Promise<any> {
    return this.delete(`/locations/${locationId}`);
  }

  // ── Availability ───────────────────────────────────────────────────

  async getAvailability(year: string, month: string, day: string, params?: {
    locationId?: number; reasonId?: number; staffId?: number;
  }): Promise<any> {
    return this.get(`/availability/${year}/${month}/${day}`, params);
  }

  // ── Working Hours ──────────────────────────────────────────────────

  async getWorkingHours(professionalId: number): Promise<any> {
    return this.get(`/workingHours/staff/${professionalId}`);
  }

  // ── Class Schedules ────────────────────────────────────────────────

  async listClassSchedules(params?: any): Promise<any> {
    this.checkFeature('classes');
    return this.get('/classSchedule', params);
  }

  async getClassSchedule(classScheduleId: number): Promise<any> {
    this.checkFeature('classes');
    return this.get(`/classSchedule/${classScheduleId}`);
  }

  // ── Recurring Appointments ─────────────────────────────────────────

  async getRecurringAppointments(recurringApptId: number): Promise<any> {
    this.checkFeature('recurringAppts');
    return this.get(`/appointments/recurringappointments/${recurringApptId}`);
  }

  // ── Groups ─────────────────────────────────────────────────────────

  async listGroups(params?: { groupType?: string }): Promise<any> {
    return this.get('/groups', params);
  }

  async getGroup(groupId: number): Promise<any> {
    return this.get(`/groups/${groupId}`);
  }

  // ── Resources ──────────────────────────────────────────────────────

  async listResources(params?: { locationId?: number; reasonId?: number }): Promise<any> {
    return this.get('/resource', params);
  }

  async getResourceAvailability(resourceId: number, date: string, startTime: number, endTime: number): Promise<boolean> {
    return this.get(`/resource/${resourceId}/isBusy/${date}/${startTime}/${endTime}`);
  }

  // ── Reports ────────────────────────────────────────────────────────

  async getAppointmentReport(params?: any): Promise<any> {
    this.checkFeature('reports');
    return this.get('/appointmentList/report', params);
  }

  async getAppointmentReportCount(params?: any): Promise<any> {
    this.checkFeature('reports');
    return this.get('/appointmentList/reportCount', params);
  }

  // ── Business ───────────────────────────────────────────────────────

  async getBusiness(): Promise<any> {
    return this.get('/business');
  }

  async getBusinessConfigurations(): Promise<any> {
    return this.get('/businessConfigurations');
  }

  // ── Enterprise (Enterprise Tier) ───────────────────────────────────

  async listEnterpriseChildren(): Promise<any> {
    this.checkFeature('enterpriseChildren');
    return this.get('/enterpriseChild');
  }

  // ── Waitlist ───────────────────────────────────────────────────────

  async listWaitlist(params?: any): Promise<any> {
    this.checkFeature('waitlist');
    return this.get('/waitlist', params);
  }

  // ── Time Off & Vacation ────────────────────────────────────────────

  async listTimeOff(professionalId: number): Promise<any> {
    return this.get(`/timeOff/staff/${professionalId}`);
  }

  async listVacation(professionalId: number): Promise<any> {
    return this.get(`/vacation/staff/${professionalId}`);
  }

  // ── Scheduler Fields ───────────────────────────────────────────────

  async listSchedulerFields(mode?: string): Promise<any> {
    return this.get(mode ? `/schedulerFieldList/mode/${mode}` : '/schedulerFieldList');
  }

  // ── Notes ──────────────────────────────────────────────────────────

  async listNotes(params?: { clientId?: number; calendarId?: number }): Promise<any> {
    return this.get('/notes', params);
  }

  // ── Messaging ──────────────────────────────────────────────────────

  async listMessages(params?: any): Promise<any> {
    return this.get('/messaging', params);
  }

  // ── Calendar ───────────────────────────────────────────────────────

  async getCalendar(params?: any): Promise<any> {
    return this.get('/calendar', params);
  }

  // ── Audit Trail ────────────────────────────────────────────────────

  async getAuditTrail(params?: any): Promise<any> {
    return this.get('/auditTrail', params);
  }

  // ── Disclaimer Forms ───────────────────────────────────────────────

  async listDisclaimerForms(): Promise<any> {
    this.checkFeature('disclaimerForms');
    return this.get('/disclaimerForm');
  }

  // ── Files ──────────────────────────────────────────────────────────

  async listFiles(params?: any): Promise<any> {
    return this.get('/files', params);
  }
}

export default TimeTapClient;
