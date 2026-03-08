export interface Student {
  id: string;
  name: string;
  class: string;
  studentId: string;
  parentName: string;
  parentPhone: string;
  photoUrl: string;
  qrCode: string;
  schoolId: string;
}

export interface PickupLog {
  id: string;
  studentId: string;
  studentName: string;
  class: string;
  parentName: string;
  pickupTime: string;
  pickupBy: string;
  status: 'picked_up' | 'waiting';
  schoolId: string;
}

export const mockStudents: Student[] = [
  { id: '1', name: 'Ahmad Rizki', class: 'TK-A', studentId: 'STD001', parentName: 'Budi Santoso', parentPhone: '08123456789', photoUrl: '', qrCode: 'STD001', schoolId: 's1' },
  { id: '2', name: 'Siti Aisyah', class: 'TK-B', studentId: 'STD002', parentName: 'Dewi Rahayu', parentPhone: '08198765432', photoUrl: '', qrCode: 'STD002', schoolId: 's1' },
  { id: '3', name: 'Muhammad Faisal', class: '1-A', studentId: 'STD003', parentName: 'Hendra Wijaya', parentPhone: '08134567890', photoUrl: '', qrCode: 'STD003', schoolId: 's1' },
  { id: '4', name: 'Zahra Putri', class: '1-B', studentId: 'STD004', parentName: 'Rina Marlina', parentPhone: '08156789012', photoUrl: '', qrCode: 'STD004', schoolId: 's1' },
  { id: '5', name: 'Rafi Pratama', class: '2-A', studentId: 'STD005', parentName: 'Agus Setiawan', parentPhone: '08167890123', photoUrl: '', qrCode: 'STD005', schoolId: 's1' },
  { id: '6', name: 'Nadia Safira', class: 'TK-A', studentId: 'STD006', parentName: 'Linda Kusuma', parentPhone: '08178901234', photoUrl: '', qrCode: 'STD006', schoolId: 's1' },
  { id: '7', name: 'Dimas Aditya', class: '2-B', studentId: 'STD007', parentName: 'Bambang Suryadi', parentPhone: '08189012345', photoUrl: '', qrCode: 'STD007', schoolId: 's1' },
  { id: '8', name: 'Anisa Rahma', class: '1-A', studentId: 'STD008', parentName: 'Sri Wahyuni', parentPhone: '08190123456', photoUrl: '', qrCode: 'STD008', schoolId: 's1' },
];

export const mockPickupLogs: PickupLog[] = [
  { id: '1', studentId: '1', studentName: 'Ahmad Rizki', class: 'TK-A', parentName: 'Budi Santoso', pickupTime: '14:30', pickupBy: 'Pak Joko', status: 'picked_up', schoolId: 's1' },
  { id: '2', studentId: '2', studentName: 'Siti Aisyah', class: 'TK-B', parentName: 'Dewi Rahayu', pickupTime: '14:35', pickupBy: 'Bu Sari', status: 'picked_up', schoolId: 's1' },
  { id: '3', studentId: '3', studentName: 'Muhammad Faisal', class: '1-A', parentName: 'Hendra Wijaya', pickupTime: '', pickupBy: '', status: 'waiting', schoolId: 's1' },
  { id: '4', studentId: '4', studentName: 'Zahra Putri', class: '1-B', parentName: 'Rina Marlina', pickupTime: '', pickupBy: '', status: 'waiting', schoolId: 's1' },
  { id: '5', studentId: '5', studentName: 'Rafi Pratama', class: '2-A', parentName: 'Agus Setiawan', pickupTime: '14:45', pickupBy: 'Pak Joko', status: 'picked_up', schoolId: 's1' },
  { id: '6', studentId: '6', studentName: 'Nadia Safira', class: 'TK-A', parentName: 'Linda Kusuma', pickupTime: '', pickupBy: '', status: 'waiting', schoolId: 's1' },
  { id: '7', studentId: '7', studentName: 'Dimas Aditya', class: '2-B', parentName: 'Bambang Suryadi', pickupTime: '', pickupBy: '', status: 'waiting', schoolId: 's1' },
  { id: '8', studentId: '8', studentName: 'Anisa Rahma', class: '1-A', parentName: 'Sri Wahyuni', pickupTime: '14:50', pickupBy: 'Bu Sari', status: 'picked_up', schoolId: 's1' },
];

export const dashboardStats = {
  totalStudents: 8,
  pickedUp: 4,
  waiting: 4,
  totalPickups: 4,
};
