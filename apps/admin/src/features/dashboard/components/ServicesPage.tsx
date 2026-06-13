import type { ServicePayload } from '../../../api/adminApi'
import type { ServiceItem } from '../../../types/admin'
import { useServicesPage } from '../hooks/useServicesPage'
import { ManagementToolbar } from './ManagementToolbar'
import { ServiceDeleteDialog } from './ServiceDeleteDialog'
import { ServiceEditorSheet } from './ServiceEditorSheet'
import { ServiceList } from './ServiceList'

export function ServicesPage({
  services,
  onAddService,
  onDeleteService,
  onError,
  onUpdateService,
}: {
  services: ServiceItem[]
  onAddService: (payload: ServicePayload) => Promise<void>
  onDeleteService: (serviceId: string) => Promise<void>
  onError: () => void
  onUpdateService: (serviceId: string, payload: ServicePayload) => Promise<void>
}) {
  const state = useServicesPage({ onAddService, onDeleteService, onError, onUpdateService, services })
  return (
    <>
      <ManagementToolbar addLabel="เพิ่มบริการ" onAdd={() => state.openEditor()} onSearch={state.setQuery} placeholder="ค้นหาบริการ" query={state.query} />
      <ServiceList
        filteredServices={state.filteredServices}
        services={services}
        togglingServiceId={state.togglingServiceId}
        onDelete={state.setServiceToDelete}
        onEdit={state.openEditor}
        onToggleActive={state.handleToggleServiceActive}
      />
      <ServiceEditorSheet
        canAdd={state.canAdd}
        descriptionTh={state.descriptionTh}
        durationMinutes={state.durationMinutes}
        editingService={state.editingService}
        isOpen={state.isEditorOpen}
        isSaving={state.isSavingService}
        nameTh={state.nameTh}
        priceBaht={state.priceBaht}
        setDescriptionTh={state.setDescriptionTh}
        setDurationMinutes={state.setDurationMinutes}
        setNameTh={state.setNameTh}
        setPriceBaht={state.setPriceBaht}
        onClose={state.closeEditor}
        onSave={state.handleSaveService}
      />
      <ServiceDeleteDialog
        isDeleting={state.isDeletingService}
        service={state.serviceToDelete}
        onClose={() => state.setServiceToDelete(null)}
        onDelete={state.handleDeleteService}
      />
    </>
  )
}
