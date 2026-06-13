import { Button, Dialog, DialogActions, DialogContent, DialogTitle, Typography } from '@mui/material'
import type { ServiceItem } from '../../../types/admin'

type ServiceDeleteDialogProps = {
  isDeleting: boolean
  onClose: () => void
  onDelete: () => void
  service: ServiceItem | null
}

export function ServiceDeleteDialog({ isDeleting, onClose, onDelete, service }: ServiceDeleteDialogProps) {
  return (
    <Dialog open={Boolean(service)} onClose={onClose} maxWidth="xs" fullWidth>
      <DialogTitle sx={{ fontWeight: 950 }}>ยืนยันการลบบริการ</DialogTitle>
      <DialogContent>
        <Typography sx={{ color: 'text.secondary', fontWeight: 760 }}>
          ต้องการลบ {service?.nameTh ?? 'บริการนี้'} ใช่หรือไม่
        </Typography>
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 3 }}>
        <Button variant="outlined" disabled={isDeleting} onClick={onClose}>ยกเลิก</Button>
        <Button variant="contained" disabled={isDeleting} onClick={onDelete} sx={{ bgcolor: '#DC2626', color: '#FFFFFF', '&:hover': { bgcolor: '#B91C1C' } }}>
          {isDeleting ? 'กำลังลบ...' : 'ยืนยันลบ'}
        </Button>
      </DialogActions>
    </Dialog>
  )
}
