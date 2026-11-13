import { NextResponse } from 'next/server';
import { generateSampleCSVString } from '@/lib/sampleData';

export async function GET() {
  const csvData = generateSampleCSVString();
  return new NextResponse(csvData, {
    status: 200,
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': 'attachment; filename="template_nilai_siswa_kmeans.csv"',
    },
  });
}
