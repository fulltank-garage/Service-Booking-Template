import { useMemo, useState } from 'react'
import type { ServicePayload } from '../../../api/adminApi'
import type { ServiceItem } from '../../../types/admin'
import { formatThaiPrice } from '../utils/formatters'

type ServicesPageOptions = {
  onAddService: (payload: ServicePayload) => Promise<void>
  onDeleteService: (serviceId: string) => Promise<void>
  onError: () => void
  onUpdateService: (serviceId: string, payload: ServicePayload) => Promise<void>
  services: ServiceItem[]
}

export function useServicesPage({ onAddService, onDeleteService, onError, onUpdateService, services }: ServicesPageOptions) {
  const [query, setQuery] = useState('')
  const [isEditorOpen, setIsEditorOpen] = useState(false)
  const [editingService, setEditingService] = useState<ServiceItem | null>(null)
  const [serviceToDelete, setServiceToDelete] = useState<ServiceItem | null>(null)
  const [nameTh, setNameTh] = useState('')
  const [priceBaht, setPriceBaht] = useState('')
  const [durationMinutes, setDurationMinutes] = useState('')
  const [descriptionTh, setDescriptionTh] = useState('')
  const [isSavingService, setIsSavingService] = useState(false)
  const [isDeletingService, setIsDeletingService] = useState(false)
  const [togglingServiceId, setTogglingServiceId] = useState('')
  const canAdd = Boolean(nameTh.trim() && Number(priceBaht) >= 0 && Number(durationMinutes) > 0)
  const filteredServices = useMemo(() => {
    const term = query.trim().toLowerCase()
    if (!term) return services
    return services.filter((service) =>
      [service.nameTh, service.nameEn, service.descriptionTh, service.durationMinutes.toString(), formatThaiPrice(service.priceCents)]
        .join(' ').toLowerCase().includes(term),
    )
  }, [query, services])
  const resetForm = () => {
    setNameTh('')
    setPriceBaht('')
    setDurationMinutes('')
    setDescriptionTh('')
  }
  const openEditor = (service?: ServiceItem) => {
    if (service) {
      setEditingService(service)
      setNameTh(service.nameTh)
      setPriceBaht(String(service.priceCents / 100))
      setDurationMinutes(String(service.durationMinutes))
      setDescriptionTh(service.descriptionTh ?? '')
    } else {
      setEditingService(null)
      resetForm()
    }
    setIsEditorOpen(true)
  }
  const closeEditor = () => {
    setIsEditorOpen(false)
    window.setTimeout(() => {
      setEditingService(null)
      resetForm()
    }, 520)
  }
  const handleSaveService = async () => {
    if (!canAdd || isSavingService) return
    const payload = {
      nameTh: nameTh.trim(),
      nameEn: editingService?.nameEn ?? nameTh.trim(),
      descriptionTh: descriptionTh.trim(),
      durationMinutes: Number(durationMinutes),
      priceCents: Math.round(Number(priceBaht) * 100),
      accentColor: editingService?.accentColor ?? '#FF008C',
      isActive: editingService?.isActive ?? true,
    }
    setIsSavingService(true)
    try {
      if (editingService) await onUpdateService(editingService.id, payload)
      else await onAddService(payload)
      closeEditor()
    } catch {
      onError()
    } finally {
      setIsSavingService(false)
    }
  }
  const handleDeleteService = async () => {
    if (!serviceToDelete || isDeletingService) return
    setIsDeletingService(true)
    try {
      await onDeleteService(serviceToDelete.id)
      setServiceToDelete(null)
    } catch {
      onError()
    } finally {
      setIsDeletingService(false)
    }
  }
  const handleToggleServiceActive = async (service: ServiceItem) => {
    if (togglingServiceId) return
    setTogglingServiceId(service.id)
    try {
      await onUpdateService(service.id, { ...service, descriptionTh: service.descriptionTh ?? '', isActive: !service.isActive })
    } catch {
      onError()
    } finally {
      setTogglingServiceId('')
    }
  }
  return {
    canAdd, closeEditor, descriptionTh, durationMinutes, editingService, filteredServices,
    handleDeleteService, handleSaveService, handleToggleServiceActive, isDeletingService,
    isEditorOpen, isSavingService, nameTh, openEditor, priceBaht, query, serviceToDelete,
    setDescriptionTh, setDurationMinutes, setNameTh, setPriceBaht, setQuery, setServiceToDelete,
    togglingServiceId,
  }
}
