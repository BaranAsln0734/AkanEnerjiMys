import api from '../api';
import { toast } from 'react-hot-toast';

export interface PendingService {
  id: string;
  generator_id: number;
  service_date: string;
  description: string;
  technician_signature: string;
  customer_signature: string;
  next_maintenance_date: string;
  service_fee: number;
}

export const queueOfflineService = (service: Omit<PendingService, 'id'>) => {
  const queue: PendingService[] = JSON.parse(localStorage.getItem('pending_services') || '[]');
  const newService: PendingService = {
    ...service,
    id: `offline-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`
  };
  queue.push(newService);
  localStorage.setItem('pending_services', JSON.stringify(queue));
};

export const syncOfflineServices = async () => {
  const queue: PendingService[] = JSON.parse(localStorage.getItem('pending_services') || '[]');
  if (queue.length === 0) return;

  console.log(`Syncing ${queue.length} offline service records...`);
  const remaining: PendingService[] = [];
  let successCount = 0;

  for (const service of queue) {
    try {
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { id, ...postData } = service;
      await api.post('/service-records', postData);
      successCount++;
    } catch (err) {
      console.error('Failed to sync offline service:', service, err);
      remaining.push(service);
    }
  }

  localStorage.setItem('pending_services', JSON.stringify(remaining));

  if (successCount > 0) {
    toast.success(`Çevrimdışı kaydedilen ${successCount} servis kaydı sunucuya başarıyla yüklendi!`, {
      duration: 5000,
      icon: '🔄'
    });
  }
};
