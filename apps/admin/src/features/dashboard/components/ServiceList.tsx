import { Box, Button, Card, CardContent, Chip, Stack, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Typography } from '@mui/material'
import type { ServiceItem } from '../../../types/admin'
import { formatThaiPrice } from '../utils/formatters'
import { ServiceActiveControl } from './ServiceActiveControl'

type ServiceListProps = {
  filteredServices: ServiceItem[]
  onDelete: (service: ServiceItem) => void
  onEdit: (service: ServiceItem) => void
  onToggleActive: (service: ServiceItem) => void
  services: ServiceItem[]
  togglingServiceId: string
}

export function ServiceList({ filteredServices, onDelete, onEdit, onToggleActive, services, togglingServiceId }: ServiceListProps) {
  const emptyText = services.length === 0 ? 'ยังไม่มีรายการบริการ' : 'ไม่พบบริการที่ค้นหา'
  return (
    <Box component="section" sx={{ pt: { xs: 8, lg: 10 } }}>
      <Card sx={{ borderRadius: 3, border: '1px solid', borderColor: 'divider', boxShadow: 'none' }}>
        <CardContent sx={{ p: 2.5 }}>
          <Stack direction="row" spacing={1.5} sx={{ mb: 2, alignItems: 'center', justifyContent: 'space-between', minWidth: 0 }}>
            <Typography variant="h2" sx={{ minWidth: 0, flex: 1 }}>รายการบริการของร้าน</Typography>
            <Chip color="secondary" label={`${filteredServices.length} รายการ`} sx={{ flexShrink: 0, whiteSpace: 'nowrap' }} />
          </Stack>
          <Stack spacing={1.5} sx={{ display: { xs: 'flex', sm: 'none' } }}>
            {filteredServices.map((service) => (
              <Box key={service.id} sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 2.5, p: 1.5, bgcolor: 'background.default' }}>
                <Stack spacing={1.25}>
                  <Box>
                    <Typography sx={{ fontWeight: 900 }}>{service.nameTh}</Typography>
                    <Typography variant="body2" color="text.secondary">{service.descriptionTh || service.nameEn}</Typography>
                  </Box>
                  <Stack direction="row" spacing={1} sx={{ justifyContent: 'space-between', alignItems: 'center' }}>
                    <Box><Typography variant="caption" color="text.secondary">ราคา</Typography><Typography sx={{ fontWeight: 850 }}>{formatThaiPrice(service.priceCents)}</Typography></Box>
                    <Box><Typography variant="caption" color="text.secondary">เวลา</Typography><Typography sx={{ fontWeight: 850 }}>{service.durationMinutes} นาที</Typography></Box>
                    <ServiceActiveControl checked={service.isActive} disabled={togglingServiceId === service.id} onChange={() => onToggleActive(service)} />
                  </Stack>
                  <Stack direction="row" spacing={1} sx={{ justifyContent: 'flex-end' }}>
                    <Button variant="outlined" onClick={() => onEdit(service)}>แก้ไข</Button>
                    <Button variant="contained" onClick={() => onDelete(service)} sx={{ bgcolor: '#DC2626', color: '#FFFFFF', '&:hover': { bgcolor: '#B91C1C' } }}>ลบ</Button>
                  </Stack>
                </Stack>
              </Box>
            ))}
            {filteredServices.length === 0 && <Typography sx={{ py: 4, textAlign: 'center', color: 'text.secondary', fontWeight: 800 }}>{emptyText}</Typography>}
          </Stack>
          <TableContainer sx={{ display: { xs: 'none', sm: 'block' } }}>
            <Table aria-label="service table">
              <TableHead><TableRow><TableCell>บริการ</TableCell><TableCell>ราคา</TableCell><TableCell>เวลา</TableCell><TableCell>สถานะ</TableCell><TableCell align="right">จัดการ</TableCell></TableRow></TableHead>
              <TableBody>
                {filteredServices.map((service) => (
                  <TableRow key={service.id}>
                    <TableCell><Typography sx={{ fontWeight: 850 }}>{service.nameTh}</Typography><Typography variant="body2" color="text.secondary">{service.descriptionTh || service.nameEn}</Typography></TableCell>
                    <TableCell sx={{ fontWeight: 800 }}>{formatThaiPrice(service.priceCents)}</TableCell>
                    <TableCell>{service.durationMinutes} นาที</TableCell>
                    <TableCell><ServiceActiveControl checked={service.isActive} disabled={togglingServiceId === service.id} onChange={() => onToggleActive(service)} /></TableCell>
                    <TableCell align="right"><Stack direction="row" spacing={1} sx={{ justifyContent: 'flex-end' }}><Button variant="outlined" onClick={() => onEdit(service)}>แก้ไข</Button><Button variant="contained" onClick={() => onDelete(service)} sx={{ bgcolor: '#DC2626', color: '#FFFFFF', '&:hover': { bgcolor: '#B91C1C' } }}>ลบ</Button></Stack></TableCell>
                  </TableRow>
                ))}
                {filteredServices.length === 0 && <TableRow><TableCell colSpan={5} sx={{ py: 5, textAlign: 'center', color: 'text.secondary', fontWeight: 800 }}>{emptyText}</TableCell></TableRow>}
              </TableBody>
            </Table>
          </TableContainer>
        </CardContent>
      </Card>
    </Box>
  )
}
