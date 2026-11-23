import os
import sys
import django
from datetime import timedelta
from django.utils import timezone

sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from apps.core.models import Patient as CorePatient
from apps.patients.models import Patient as PatientPatient, ImagingRequest

def seed_imaging():
    patients = list(CorePatient.objects.all())
    if not patients:
        print("No patients found in DB.")
        return

    now = timezone.now()

    sample_requests = [
        {
            "patient_idx": 0,
            "accession_number": "RAD-2026-08192",
            "modality": "CT",
            "priority": "stat",
            "body_part": "Chest (High Resolution HRCT)",
            "clinical_indication": "Acute shortness of breath, suspected pulmonary embolism / interstitial pneumonitis. SpO2 88% on room air.",
            "status": "pending",
            "findings": "",
            "impression": "",
            "radiologist_name": "",
            "notes": "Patient requires IV contrast protocol check (eGFR confirmed normal).",
            "requested_at": now - timedelta(hours=1, minutes=20),
            "completed_at": None,
        },
        {
            "patient_idx": 1 if len(patients) > 1 else 0,
            "accession_number": "RAD-2026-08191",
            "modality": "MRI",
            "priority": "urgent",
            "body_part": "Brain & Cervical Spine (with contrast)",
            "clinical_indication": "Progressive right-sided weakness, persistent focal motor seizures. Rule out demyelination / intracranial mass.",
            "status": "in-progress",
            "findings": "",
            "impression": "",
            "radiologist_name": "",
            "notes": "Patient screened for metal implants - cleared for 3T MRI.",
            "requested_at": now - timedelta(hours=3, minutes=45),
            "completed_at": None,
        },
        {
            "patient_idx": 2 if len(patients) > 2 else 0,
            "accession_number": "RAD-2026-08189",
            "modality": "X-Ray",
            "priority": "routine",
            "body_part": "Right Ankle (AP, Lateral & Mortise views)",
            "clinical_indication": "Inversion injury sustained during sports, acute swelling and inability to bear weight. Assess for malleolar fracture.",
            "status": "pending",
            "findings": "",
            "impression": "",
            "radiologist_name": "",
            "notes": "Follow Ottawa Ankle Rules.",
            "requested_at": now - timedelta(hours=5),
            "completed_at": None,
        },
        {
            "patient_idx": 3 if len(patients) > 3 else 0,
            "accession_number": "RAD-2026-08185",
            "modality": "Ultrasound",
            "priority": "urgent",
            "body_part": "Abdomen & Pelvis (FAST scan)",
            "clinical_indication": "Right upper quadrant pain with Murphy's sign positive, fever 38.5C. Evaluate for acute cholecystitis vs choledocholithiasis.",
            "status": "in-progress",
            "findings": "",
            "impression": "",
            "radiologist_name": "",
            "notes": "Fasting status verified for > 6 hours.",
            "requested_at": now - timedelta(hours=6, minutes=15),
            "completed_at": None,
        },
        {
            "patient_idx": 0,
            "accession_number": "RAD-2026-08170",
            "modality": "CT",
            "priority": "routine",
            "body_part": "Abdomen and Pelvis (Triple Phase)",
            "clinical_indication": "Follow-up scan for epigastric discomfort and elevated serum lipase.",
            "status": "completed",
            "findings": "The liver is normal in size and attenuation without focal lesions. Gallbladder and biliary tree are unremarkable. The pancreas demonstrates normal parenchyma without peripancreatic fluid collections or ductal dilatation. Spleen, adrenal glands, and kidneys are normal bilaterally. No free fluid, lymphadenopathy, or bowel pathology detected.",
            "impression": "Normal contrast-enhanced CT study of the abdomen and pelvis. No acute inflammatory or neoplastic process identified.",
            "radiologist_name": "Dr. N. Fernando, MBBS, MD, FRCR (Consultant Radiologist)",
            "notes": "Report finalized and transmitted to referring clinician via PACS.",
            "requested_at": now - timedelta(days=2),
            "completed_at": now - timedelta(days=1, hours=22),
        },
        {
            "patient_idx": 1 if len(patients) > 1 else 0,
            "accession_number": "RAD-2026-08165",
            "modality": "MRI",
            "priority": "urgent",
            "body_part": "Lumbar Spine (Sagittal & Axial T1/T2)",
            "clinical_indication": "Severe L5-S1 radicular pain refractory to conservative therapy.",
            "status": "completed",
            "findings": "Normal lumbar lordosis. Conus medullaris terminates normally at L1. At L5-S1 level, there is a prominent left paracentral disc extrusion measuring 6mm, producing moderate central canal stenosis and significant compression of the descending left S1 nerve root within the lateral recess. Intervertebral discs at L1-L4 are preserved in height and hydration.",
            "impression": "Left paracentral disc extrusion at L5-S1 with moderate canal stenosis and left S1 nerve root impingement. Correlate clinically with left S1 radiculopathy.",
            "radiologist_name": "Dr. K. Jayasuriya, MBBS, MD, FRCR (Consultant Neuroradiologist)",
            "notes": "Urgent neurosurgical consultation recommended.",
            "requested_at": now - timedelta(days=3),
            "completed_at": now - timedelta(days=2, hours=20),
        },
        {
            "patient_idx": 2 if len(patients) > 2 else 0,
            "accession_number": "RAD-2026-08152",
            "modality": "X-Ray",
            "priority": "routine",
            "body_part": "Chest (PA Erect)",
            "clinical_indication": "Pre-operative assessment prior to elective laparoscopic cholecystectomy.",
            "status": "completed",
            "findings": "Lungs are clear with no focal consolidation, pneumothorax, or pleural effusion. Cardiothoracic ratio is within normal limits (< 0.50). Mediastinal contours and hila are normal. Visualized bony thorax and soft tissues are unremarkable.",
            "impression": "Normal PA chest radiograph. Clear lungs and normal cardiac silhouette.",
            "radiologist_name": "Dr. N. Fernando, MBBS, MD, FRCR (Consultant Radiologist)",
            "notes": "Cleared for anesthesia from radiological perspective.",
            "requested_at": now - timedelta(days=4),
            "completed_at": now - timedelta(days=4, hours=2),
        },
    ]

    for item in sample_requests:
        pat = patients[item["patient_idx"]]
        p_obj, _ = PatientPatient.objects.get_or_create(id=pat.id, defaults={"name": pat.name})
        
        ImagingRequest.objects.create(
            patient=p_obj,
            accession_number=item["accession_number"],
            modality=item["modality"],
            priority=item["priority"],
            body_part=item["body_part"],
            clinical_indication=item["clinical_indication"],
            status=item["status"],
            findings=item["findings"],
            impression=item["impression"],
            radiologist_name=item["radiologist_name"],
            notes=item["notes"],
            completed_at=item["completed_at"],
        )

    print(f"Successfully seeded {len(sample_requests)} imaging studies.")

if __name__ == '__main__':
    seed_imaging()
