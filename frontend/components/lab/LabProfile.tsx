import React, { useEffect, useState } from 'react';
import LabParameter from './LabParameter';

interface LabSection {
  category: number;
  section: number;
  name?: string;
}

interface LabSubcategory {
  id: number;
  name: string;
  display_name: string;
  category_id: number;
  section?: number;
  ref_val_lower?: number | string;
  ref_val_upper?: number | string;
  ref_val_lower_f?: number | string;
  ref_val_upper_f?: number | string;
  ref_val_sub_1?: number | string;
  ref_val_sub_2?: number | string;
  unit?: string;
  notes?: string;
  calc_status?: string;
}

interface TestValue {
  id?: number;
  value?: number | string;
}

interface LabProfileProps {
  labCategoryId: number;
  labOrderId: number;
  categoryReference?: {
    ref_val_lower?: number | string;
    ref_val_upper?: number | string;
    ref_val_lower_f?: number | string;
    ref_val_upper_f?: number | string;
    unit?: string;
  };
  useCategoryReference?: boolean;
  isEditable?: boolean;
  sections?: LabSection[];
  subcategories?: LabSubcategory[];
  testValues?: Record<string, TestValue>;
  onValueChange?: (name: string, value: string, testId?: number) => void;
}

const LabProfile: React.FC<LabProfileProps> = ({
  labCategoryId,
  labOrderId,
  categoryReference,
  useCategoryReference = false,
  isEditable = false,
  sections = [],
  subcategories = [],
  testValues = {},
  onValueChange
}) => {
  const [calculatedValues, setCalculatedValues] = useState<Record<string, TestValue>>({});

  const resolveCalcSourceValue = (sourceKey: any) => {
    if (sourceKey === undefined || sourceKey === null) return undefined;
    const directKey = sourceKey.toString().toUpperCase();
    if (testValues[directKey]?.value !== undefined) {
      return testValues[directKey]?.value;
    }

    if (typeof sourceKey === 'number' || /^\d+$/.test(sourceKey.toString())) {
      const idValue = Number(sourceKey);
      const sourceSubcategory = subcategories.find((sub) => sub.id === idValue);
      if (sourceSubcategory) {
        const nameKey = sourceSubcategory.name.toUpperCase();
        return testValues[nameKey]?.value;
      }
    }

    return undefined;
  };

  const calculateValue = (subcategory: LabSubcategory): TestValue | undefined => {
    if (!subcategory.calc_status || subcategory.calc_status === '0') return undefined;

    try {
      const calcConfig = JSON.parse(subcategory.calc_status);
      const sourceValue = resolveCalcSourceValue(calcConfig.source);
      const baseValue = calcConfig.base ? resolveCalcSourceValue(calcConfig.base) : null;

      if (!sourceValue) return undefined;

      const source = typeof sourceValue === 'string' ? parseFloat(sourceValue) : sourceValue;
      const base = baseValue ? (typeof baseValue === 'string' ? parseFloat(baseValue) : baseValue) : null;

      let calculated = 0;

      // Different calculation methods based on category
      if (subcategory.category_id === 1 && base) {
        calculated = Math.round((base * source / 100) * 100) / 100;
      } else if ([3, 4, 5].includes(subcategory.category_id)) {
        calculated = Math.round((source / 18) * 100) / 100;
      } else if (subcategory.category_id === 10) {
        calculated = Math.round((source * 88.42) * 100) / 100;
      } else if ([40, 47].includes(subcategory.category_id) && base) {
        calculated = Math.round((source / base * 1000) * 100) / 100;
      } else if (subcategory.category_id === 18 && base) {
        calculated = Math.round((source / base) * 100) / 100;
      } else if (subcategory.id === 24) {
        calculated = Math.round(source / 5);
      } else if (subcategory.id === 25 && base) {
        calculated = Math.round((source / base) * 100) / 100;
      }

      return { value: calculated };
    } catch (error) {
      console.error('Error calculating value:', error);
      return undefined;
    }
  };

  useEffect(() => {
    const newCalculatedValues: Record<string, TestValue> = {};

    subcategories.forEach(subcategory => {
      if (subcategory.calc_status && subcategory.calc_status !== '0' && !testValues[subcategory.name.toUpperCase()]) {
        const calculated = calculateValue(subcategory);
        if (calculated) {
          newCalculatedValues[subcategory.name.toUpperCase()] = calculated;
        }
      }
    });

    setCalculatedValues(newCalculatedValues);
  }, [testValues, subcategories]);

  const getTestValue = (name: string): TestValue | undefined => {
    const upperName = name.toUpperCase();
    return testValues[upperName] || calculatedValues[upperName];
  };

  const renderSubcategoryRow = (
    subcategory: LabSubcategory,
    key: string
  ) => {
    const test = getTestValue(subcategory.name);
    const parameterInfo = useCategoryReference && categoryReference
      ? {
          ...subcategory,
          ref_val_lower: categoryReference.ref_val_lower,
          ref_val_upper: categoryReference.ref_val_upper,
          ref_val_lower_f: categoryReference.ref_val_lower_f,
          ref_val_upper_f: categoryReference.ref_val_upper_f,
          unit: categoryReference.unit
        }
      : subcategory;

    const hasRefValue = (value?: number | string) => {
      if (value === undefined || value === null) return false;
      const trimmed = value.toString().trim();
      return trimmed !== '' && trimmed !== '0';
    };

    const hasSubRef1 = hasRefValue(subcategory.ref_val_sub_1);
    const hasSubRef2 = hasRefValue(subcategory.ref_val_sub_2);
    const hasNotes = !!subcategory.notes?.toString().trim();

    return (
      <React.Fragment key={key}>
        <LabParameter
          parameterInfo={parameterInfo}
          test={test}
          isEditable={isEditable}
          onValueChange={onValueChange}
        />

        {hasSubRef1 && (
          <LabParameter
            parameterInfo={{ ...subcategory, display_name: '' }}
            allowNameFallback={false}
            refValSub1={subcategory.ref_val_sub_1}
            refValSub1Upper={subcategory.ref_val_sub_1}
            refValSub2ForS3={hasSubRef2 ? subcategory.ref_val_sub_2 : undefined}
            level4={hasSubRef2}
          />
        )}

        {hasSubRef2 && (
          <LabParameter
            parameterInfo={{ ...subcategory, display_name: '' }}
            allowNameFallback={false}
            refValSub2={subcategory.ref_val_sub_2}
          />
        )}

        {hasNotes && (
          <LabParameter
            parameterInfo={{ ...subcategory, display_name: '' }}
            allowNameFallback={false}
            notes={subcategory.notes}
          />
        )}
      </React.Fragment>
    );
  };

  const renderedSubcategoryIds = new Set<number>();

  return (
    <>
      {sections.length > 0
        ? sections.map((section, sectionIndex) => {
            const sectionSubcategories = subcategories.filter((sub) => {
              if (sub.section === undefined || sub.section === null) {
                return false;
              }
              return section.section !== undefined && sub.section === section.section;
            });

            return (
              <React.Fragment key={sectionIndex}>
                <tr>
                  <td className="parameter-title font-weight-bold bg-light" colSpan={4}>
                    <p>{section.name}</p>
                  </td>
                </tr>

                {sectionSubcategories.map((subcategory, subIndex) => {
                  if (renderedSubcategoryIds.has(subcategory.id)) {
                    return null;
                  }
                  renderedSubcategoryIds.add(subcategory.id);
                  return renderSubcategoryRow(subcategory, `${sectionIndex}-${subIndex}`);
                })}
              </React.Fragment>
            );
          })
        : subcategories.map((subcategory, subIndex) => (
            renderSubcategoryRow(subcategory, `flat-${subIndex}`)
          ))}
    </>
  );
};

export default LabProfile;
