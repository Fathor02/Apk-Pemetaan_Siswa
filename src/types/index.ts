export interface RawNilaiRecord {
  nis: string;
  nama_lengkap: string;
  kelas: string;
  kode_mapel: string;
  nama_mapel: string;
  nilai_harian: number;
  nilai_uts: number;
  nilai_uas: number;
  semester: number;
  nilai_akhir: number;
}

export interface SiswaAggregated {
  nis: string;
  nama_lengkap: string;
  kelas: string;
  nilai_harian_avg: number;
  nilai_uts_avg: number;
  nilai_uas_avg: number;
  nilai_akhir_avg: number;
  mapel_count: number;
  records: RawNilaiRecord[];
}

export type ClusterCategory = 'Tinggi' | 'Sedang' | 'Rendah';

export interface ClusterInfo {
  index: number;
  label: ClusterCategory;
  color: string;
  centroid: number[];
  count: number;
  percentage: number;
}

export interface StudentClustered {
  id?: string;
  nis: string;
  nama_lengkap: string;
  kelas: string;
  features: number[];
  nilai_harian: number;
  nilai_uts: number;
  nilai_uas: number;
  nilai_akhir: number;
  clusterIndex: number;
  clusterLabel: ClusterCategory;
  jarak_ke_centroid: number;
  a: number;
  b: number;
  s: number;
}

export interface ClusteringResult {
  mode: '3D' | '1D'; // 3D: [Harian, UTS, UAS] | 1D: [Nilai Akhir]
  k: number;
  iterations: number;
  converged: boolean;
  silhouetteAvg: number;
  silhouetteInterpretation: {
    status: 'Sangat Baik' | 'Baik' | 'Cukup' | 'Buruk';
    description: string;
    color: string;
  };
  clusters: ClusterInfo[];
  students: StudentClustered[];
  totalStudents: number;
  calculatedAt: string;
  periodeAnalisis: string;
}

export interface SupabaseConfigStatus {
  isConfigured: boolean;
  url?: string;
}
