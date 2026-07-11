"use client";

import {
  VocabAssignmentPanel,
  type AssignableStudent,
  type ClassWithStudents,
  type FolderAssignmentRow,
} from "@/components/vocab/VocabAssignmentPanel";
import * as adminAssign from "@/app/admin/vocab/assign-actions";
import * as teacherAssign from "@/app/teacher/vocab/assign-actions";

type VocabRole = "admin" | "teacher";

interface VocabAssignmentSectionBaseProps {
  role: VocabRole;
  scopeLabel: string;
  setCount: number;
  setTitles: string[];
  classes: ClassWithStudents[];
  allStudents: AssignableStudent[];
  assignments: FolderAssignmentRow[];
}

interface VocabSetAssignmentSectionProps extends VocabAssignmentSectionBaseProps {
  variant: "set";
  setId: string;
}

interface VocabFolderAssignmentSectionProps extends VocabAssignmentSectionBaseProps {
  variant: "folder";
  folderId: string;
}

interface VocabBulkAssignmentSectionProps extends VocabAssignmentSectionBaseProps {
  variant: "bulk";
  setIds: string[];
}

export type VocabAssignmentSectionProps =
  | VocabSetAssignmentSectionProps
  | VocabFolderAssignmentSectionProps
  | VocabBulkAssignmentSectionProps;

function getAssignActions(role: VocabRole) {
  return role === "admin" ? adminAssign : teacherAssign;
}

export function VocabAssignmentSection(props: VocabAssignmentSectionProps) {
  const {
    role,
    scopeLabel,
    setCount,
    setTitles,
    classes,
    allStudents,
    assignments,
  } = props;
  const actions = getAssignActions(role);

  if (props.variant === "set") {
    const { setId } = props;
    return (
      <VocabAssignmentPanel
        scopeLabel={scopeLabel}
        setCount={setCount}
        setTitles={setTitles}
        classes={classes}
        allStudents={allStudents}
        assignments={assignments}
        onAssignToClass={actions.assignSetToClass.bind(null, setId)}
        onAssignToStudents={actions.assignSetToStudents.bind(null, setId)}
        onRemoveAssignment={(assignmentId) =>
          actions.removeSetAssignment(assignmentId, setId)
        }
      />
    );
  }

  if (props.variant === "folder") {
    const { folderId } = props;
    return (
      <VocabAssignmentPanel
        scopeLabel={scopeLabel}
        setCount={setCount}
        setTitles={setTitles}
        classes={classes}
        allStudents={allStudents}
        assignments={assignments}
        onAssignToClass={actions.assignFolderToClass.bind(null, folderId)}
        onAssignToStudents={actions.assignFolderToStudents.bind(null, folderId)}
        onRemoveAssignment={(assignmentId) =>
          actions.removeFolderVocabAssignment(assignmentId, folderId)
        }
      />
    );
  }

  const { setIds } = props;
  return (
    <VocabAssignmentPanel
      scopeLabel={scopeLabel}
      setCount={setCount}
      setTitles={setTitles}
      classes={classes}
      allStudents={allStudents}
      assignments={assignments}
      onAssignToClass={async (classId) => {
        try {
          return await actions.bulkAssignVocabSetsToClass(setIds, classId);
        } catch (e) {
          return {
            ok: false,
            message:
              e instanceof Error ? e.message : "배정 요청에 실패했습니다.",
          };
        }
      }}
      onAssignToStudents={async (studentIds, classId) => {
        try {
          return await actions.bulkAssignVocabSetsToStudents(
            setIds,
            studentIds,
            classId
          );
        } catch (e) {
          return {
            ok: false,
            message:
              e instanceof Error ? e.message : "배정 요청에 실패했습니다.",
          };
        }
      }}
      onRemoveAssignment={async () => ({
        ok: false,
        message: "일괄 선택 모드에서는 개별 배정 해제를 사용할 수 없습니다.",
      })}
    />
  );
}
