import React from 'react';
import LabProfile from './LabProfile';
import LabParameter from './LabParameter';

interface LabCategory {
  id: number;
  category: string;
  name: string;
  department: string;
  ref_val_lower?: number | string;
  ref_val_upper?: number | string;
  ref_val_lower_f?: number | string;
  ref_val_upper_f?: number | string;
  unit?: string;
  subcategory_status?: boolean;
  processing_method?: string;
  separate_ref?: boolean;
}

interface LabReportTableProps {
  labCategory: LabCategory;
  labOrderId: number;
  categoryId?: number;
  isEditable?: boolean;
  sections?: any[];
  subcategories?: any[];
  testValues?: Record<string, any>;
  onValueChange?: (name: string, value: string, testId?: number) => void;
  onFileUpload?: (file: File) => void;
  patientId?: number;
}

const LabReportTable: React.FC<LabReportTableProps> = ({
  labCategory,
  labOrderId,
  categoryId,
  isEditable = false,
  sections = [],
  subcategories = [],
  testValues = {},
  onValueChange,
  onFileUpload,
  patientId
}) => {
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && onFileUpload) {
      onFileUpload(file);
    }
  };

  // Determine margin class based on category ID
  const getMarginClass = () => {
    if (categoryId && [1, 2, 6].includes(categoryId)) {
      return ' margin-0';
    }
    return '';
  };

  return (
    <div className={`result-section${getMarginClass()}`}>
      <table className="table table-report-body">
        <tbody>
          {labCategory.subcategory_status || subcategories.length > 0 ? (
            <LabProfile
              labCategoryId={labCategory.id}
              labOrderId={labOrderId}
              categoryReference={labCategory}
              useCategoryReference={false}
              isEditable={isEditable}
              sections={sections}
              subcategories={subcategories}
              testValues={testValues}
              onValueChange={onValueChange}
            />
          ) : (
            <LabParameter
              parameterInfo={{
                ...labCategory,
                display_name: labCategory.name
              }}
              test={testValues[labCategory.category.toUpperCase()]}
              isEditable={isEditable}
              onValueChange={onValueChange}
            />
          )}

          {labCategory.processing_method === 'outside' && isEditable && (
            <tr>
              <td colSpan={4}>
                <div className="custom-file mt-4">
                  <input
                    type="file"
                    name="img_url"
                    className="custom-file-input"
                    id="img_url"
                    onChange={handleFileChange}
                    accept=".pdf,.jpg,.jpeg,.png"
                  />
                  <label className="custom-file-label" htmlFor="img_url">
                    Upload Report
                  </label>
                </div>

                <input type="hidden" name="patient" value={patientId || ''} />
                <input type="hidden" name="unique_id" value={`${labOrderId}-${categoryId}`} />
              </td>
            </tr>
          )}
        </tbody>
      </table>

      <input type="hidden" name="category_id" value={labCategory.id} />

      <style jsx>{`
        .result-section.margin-0 {
          margin: 0;
        }
        
        .result-section {
          margin: 20px 0;
        }

        .table-report-body {
          width: 100%;
          border-collapse: separate;
          border-spacing: 0 6px;
          border: none;
          border-radius: 16px;
          background: transparent;
        }

        .table-report-body td.parameter {
          width: 35%;
          font-weight: 500;
          color: #1f2937;
        }

        :global(.table-report-body td.parameter p) {
          margin-bottom: 0;
        }

        .table-report-body td.result {
          width: 20%;
          text-align: center;
          font-variant-numeric: tabular-nums;
        }

        .table-report-body td.reference {
          width: 30%;
          font-size: 0.86em;
          color: #64748b;
        }

        .table-report-body td.unit {
          width: 15%;
          text-align: center;
          color: #64748b;
          font-variant-numeric: tabular-nums;
        }

        :global(.table-report-body td.unit p) {
          margin-bottom: 0;
        }

        .table-report-body td.parameter-title {
          background: transparent;
          font-weight: 600;
          padding: 10px 0;
          text-transform: uppercase;
          letter-spacing: 0.12em;
          font-size: 0.7rem;
          color: #94a3b8;
        }

        .table-report-body td {
          padding: 10px 14px;
          border-top: none;
          background: #ffffff;
        }

        :global(.table-report-body td),
        :global(.table-report-body th) {
          border-top: none !important;
        }

        .table-report-body tr:not(.parameter-title-row) td {
          border-radius: 12px;
          box-shadow: 0 1px 0 rgba(15, 23, 42, 0.04);
        }

        .result-value {
          font-weight: 600;
          color: #1f2937;
        }

        .result-flag {
          font-weight: 600;
          color: #c2410c;
          margin-left: 10px;
        }

        .ref_value {
          display: block;
          margin-top: 5px;
        }

        .ref_flag {
          color: #0f766e;
          font-weight: 500;
          margin-left: 10px;
        }

        .custom-file-label::after {
          content: "Browse";
        }
      `}</style>
    </div>
  );
};

export default LabReportTable;
