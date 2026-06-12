import { FormControl, MenuItem, Select, Typography } from '@mui/material'
import type { ServiceItem } from '../../../types/booking'

type ServiceSelectProps = {
  isLoading: boolean
  selectedServiceId: string
  services: ServiceItem[]
  onChange: (serviceId: string) => void
}

export function ServiceSelect({ isLoading, selectedServiceId, services, onChange }: ServiceSelectProps) {
  return (
    <FormControl fullWidth>
      <Select
        aria-label="บริการ"
        value={selectedServiceId}
        disabled={isLoading}
        onChange={(event) => onChange(event.target.value)}
        displayEmpty
        renderValue={(value) => {
          if (!value) {
            return (
              <Typography component="span" sx={{ color: 'text.primary', fontWeight: 850, lineHeight: 1.4375 }}>
                เลือกบริการของคุณ
              </Typography>
            )
          }
          return services.find((service) => service.id === value)?.nameTh ?? ''
        }}
        sx={{
          bgcolor: 'background.default',
          '& .MuiSelect-select': { display: 'flex', alignItems: 'center' },
          '& .MuiOutlinedInput-notchedOutline': { borderColor: '#111827', borderWidth: 1.4 },
          '&:hover .MuiOutlinedInput-notchedOutline': { borderColor: '#FF008C' },
          '&.Mui-focused .MuiOutlinedInput-notchedOutline': { borderColor: '#FF008C', borderWidth: 2 },
        }}
      >
        <MenuItem value="" disabled>
          เลือกบริการของคุณ
        </MenuItem>
        {services.map((service) => (
          <MenuItem value={service.id} key={service.id}>
            {service.nameTh}
          </MenuItem>
        ))}
      </Select>
    </FormControl>
  )
}
